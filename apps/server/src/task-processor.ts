import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";

export interface ProcessorConfig {
  ciPresetsPath: string;
  repoPath: string;
}

interface RawTask {
  id: number;
  title: string;
  description: string;
  labels: string;
  acceptanceChecklist: string;
}

export class TaskProcessor {
  constructor(
    private db: Database,
    private config: ProcessorConfig
  ) {}

  async onStatusChanged(taskId: string, from: string, to: string) {
    console.log(`[TaskProcessor] Task ${taskId} moved from ${from} to ${to}`);

    if (to === "IN_PROGRESS") {
      await this.handleInProgress(taskId);
    }
  }

  private async handleInProgress(taskId: string) {
    try {
      const rawTask = this.db
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(taskId) as RawTask | undefined;
      if (!rawTask) return;

      const labels = JSON.parse(rawTask.labels || "[]");

      // 1. Create a "Technical Implementation Draft" artifact
      await this.createTechnicalDraft(
        taskId,
        rawTask.title,
        rawTask.description
      );

      // 2. Update acceptance checklist if empty
      await this.initChecklist(taskId, rawTask.acceptanceChecklist);

      // 3. (Optional) Trigger CI if requested via labels
      const presets = JSON.parse(
        readFileSync(this.config.ciPresetsPath, "utf-8")
      );
      if (presets.quick && labels.includes("auto-ci")) {
        await this.runCi(taskId, "quick");
      }
    } catch (err) {
      console.error(
        "[TaskProcessor] Failed to process In Progress transition:",
        err
      );
    }
  }

  private async createTechnicalDraft(
    taskId: string,
    title: string,
    description: string
  ) {
    const draftContent = `
# Implementation Plan: ${title}

## Objective
${description || "No description provided."}

## Suggested Steps
1. [ ] Analyze current codebase for related components.
2. [ ] Research potential side effects of the change.
3. [ ] Implement the core logic.
4. [ ] Run automated tests to verify.
5. [ ] Perform manual verification.

## Quality Gates
- [ ] Code follows project style guidelines.
- [ ] No regression in existing functionality.
- [ ] Documentation updated if necessary.

---
*This is an automatically generated draft to kickstart the task.*
`.trim();

    this.db
      .prepare(
        `
      INSERT INTO artifacts (taskId, type, title, contentText, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        taskId,
        "TECH_DRAFT",
        `Draft: ${title}`,
        draftContent,
        "system",
        Date.now()
      );
  }

  private async initChecklist(taskId: string, currentChecklistJson: string) {
    const current = JSON.parse(currentChecklistJson || "[]");
    if (current.length > 0) return; // Don't overwrite existing checklist

    const defaultChecklist = [
      { id: "step-1", text: "Research & Planning", done: false },
      { id: "step-2", text: "Implementation", done: false },
      { id: "step-3", text: "Testing & Verification", done: false },
    ];

    this.db
      .prepare(
        "UPDATE tasks SET acceptanceChecklist = ?, updatedAt = ? WHERE id = ?"
      )
      .run(JSON.stringify(defaultChecklist), Date.now(), taskId);

    this.db
      .prepare(
        "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
      )
      .run(
        taskId,
        "CHECKLIST_INITIALIZED",
        JSON.stringify({ itemCount: defaultChecklist.length }),
        Date.now()
      );
  }

  private async runCi(taskId: string, preset: string) {
    const presets = JSON.parse(
      readFileSync(this.config.ciPresetsPath, "utf-8")
    );
    const commands = presets[preset];
    if (!commands) return;

    let allOk = true;
    let combinedOutput = "";

    for (const cmd of commands) {
      try {
        if (/[;&|><$`\n]/.test(cmd)) throw new Error("Invalid command");

        const proc = Bun.spawn(cmd.split(" "), {
          cwd: this.config.repoPath,
          stdout: "pipe",
          stderr: "pipe",
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        combinedOutput += `\n> ${cmd}\n${stdout}${stderr}\n`;
        if (exitCode !== 0) allOk = false;
      } catch (err: unknown) {
        allOk = false;
        const message = err instanceof Error ? err.message : String(err);
        combinedOutput += `\n> ${cmd}\nError: ${message}\n`;
      }
    }

    const summary = allOk ? "All checks passed" : "Some checks failed";
    const now = Date.now();

    // Save CI_OUTPUT artifact
    this.db
      .prepare(`
      INSERT INTO artifacts (taskId, type, title, contentText, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .run(
        taskId,
        "CI_OUTPUT",
        `Auto-CI: ${preset}`,
        combinedOutput,
        "system",
        now
      );

    // Record CI_RAN event
    this.db
      .prepare(
        "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
      )
      .run(
        taskId,
        "CI_RAN",
        JSON.stringify({
          preset,
          ok: allOk,
          summary,
          source: "auto-processor",
        }),
        now
      );
  }
}
