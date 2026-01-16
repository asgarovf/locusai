import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";

export interface ProcessorConfig {
  ciPresetsPath: string;
  repoPath: string;
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
    // Check if there are any specific conditions to run CI, e.g., a "quick" preset
    // For now, we'll automatically run "quick" CI if it exists in presets
    try {
      const presets = JSON.parse(
        readFileSync(this.config.ciPresetsPath, "utf-8")
      );
      if (presets.quick) {
        console.log(
          `[TaskProcessor] Automatically triggering 'quick' CI for task ${taskId}`
        );
        await this.runCi(taskId, "quick");
      }
    } catch (err) {
      console.error(
        "[TaskProcessor] Failed to read CI presets or trigger CI:",
        err
      );
    }
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
