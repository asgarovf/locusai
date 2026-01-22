import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { Task, TaskStatus } from "@locusai/shared";
import { LocusClient } from "./index";

interface WorkerConfig {
  agentId: string;
  workspaceId: string;
  sprintId?: string;
  skills: string[];
  apiBase: string;
  mcpProjectPath: string;
  apiKey: string;
}

class AgentWorker {
  private config: WorkerConfig;
  private client: LocusClient;
  private consecutiveEmpty = 0;
  private maxEmpty = 5;
  private maxTasks = 50;
  private tasksCompleted = 0;
  private tasksFailed = 0;
  private pollInterval = 3000;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
    });
  }

  log(message: string, level: "info" | "success" | "warn" | "error" = "info") {
    const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8) ?? "";
    const prefix = {
      info: "ℹ",
      success: "✓",
      warn: "⚠",
      error: "✗",
    }[level];
    console.log(
      `[${timestamp}] [${this.config.agentId.slice(-8)}] ${prefix} ${message}`
    );
  }

  /**
   * Get next available task matching agent skills.
   * Only BACKLOG tasks are available for agents to pick up.
   */
  private async getNextTask(): Promise<Task | null> {
    try {
      const tasks = await this.client.tasks.getAvailable(
        this.config.workspaceId,
        this.config.sprintId
      );

      if (tasks.length === 0) return null;

      // Priority 1: tasks matching agent skills
      let task = tasks.find(
        (t) => t.assigneeRole && this.config.skills.includes(t.assigneeRole)
      );

      // Priority 2: first available task
      if (!task) {
        task = tasks[0];
      }

      return task || null;
    } catch (error) {
      this.log(`Error fetching tasks: ${error}`, "error");
      return null;
    }
  }

  /**
   * Claim task by moving it to IN_PROGRESS.
   * This implicitly "locks" the task since only BACKLOG tasks are available.
   */
  private async claimTask(task: Task): Promise<boolean> {
    try {
      await this.client.tasks.update(task.id, this.config.workspaceId, {
        status: TaskStatus.IN_PROGRESS,
        assignedTo: this.config.agentId,
      });

      return true;
    } catch (error) {
      this.log(`Failed to claim task: ${error}`, "error");
      return false;
    }
  }

  /**
   * Build prompt for Claude CLI from task data
   */
  private buildTaskPrompt(task: Task): string {
    let prompt = `# Task: ${task.title}\n\n`;
    prompt += `## Description\n${task.description || "No description provided."}\n\n`;

    if (task.acceptanceChecklist && task.acceptanceChecklist.length > 0) {
      prompt += `## Acceptance Criteria\n`;
      for (const item of task.acceptanceChecklist) {
        const checkbox = item.done ? "[x]" : "[ ]";
        prompt += `- ${checkbox} ${item.text}\n`;
      }
      prompt += "\n";
    }

    prompt += `## Instructions\n`;
    prompt += `Complete this task. When finished successfully, output: <promise>COMPLETE</promise>\n`;
    prompt += `If you cannot complete it, explain why and do NOT output the completion signal.\n`;

    return prompt;
  }

  /**
   * Run Claude CLI with the given prompt
   */
  private runClaudeCli(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const claude = spawn(
        "claude",
        ["--dangerously-skip-permissions", "--print"],
        {
          cwd: this.config.mcpProjectPath || process.cwd(),
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let output = "";
      let errorOutput = "";

      claude.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      claude.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      claude.on("error", (err) => {
        reject(new Error(`Failed to start Claude CLI: ${err.message}`));
      });

      claude.on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Claude exited with code ${code}: ${errorOutput}`));
        }
      });

      // Send prompt via stdin and close
      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }

  /**
   * Execute task using Claude CLI
   */
  private async executeTask(
    task: Task
  ): Promise<{ success: boolean; summary: string }> {
    this.log(`Executing: ${task.title}`, "info");

    // Log acceptance criteria
    if (task.acceptanceChecklist && task.acceptanceChecklist.length > 0) {
      this.log("Acceptance criteria:", "info");
      for (const item of task.acceptanceChecklist) {
        const icon = item.done ? "☑" : "☐";
        console.log(`     ${icon} ${item.text}`);
      }
    }

    // Build prompt and run Claude CLI
    const prompt = this.buildTaskPrompt(task);
    this.log("Running Claude CLI...", "info");

    try {
      const output = await this.runClaudeCli(prompt);

      // Check for completion signal (like Ralph does)
      const success = output.includes("<promise>COMPLETE</promise>");

      // Mark all acceptance items as done if successful
      if (success && task.acceptanceChecklist) {
        const updated = task.acceptanceChecklist.map(
          (item: { id: string; text: string; done: boolean }) => ({
            ...item,
            done: true,
          })
        );

        try {
          await this.client.tasks.update(task.id, this.config.workspaceId, {
            acceptanceChecklist: updated,
          });
        } catch (error) {
          this.log(`Warning: Failed to update checklist: ${error}`, "warn");
        }
      }

      return {
        success,
        summary: success
          ? `Task completed by Claude CLI`
          : `Claude did not signal completion. Output:\n${output.slice(0, 500)}`,
      };
    } catch (error) {
      return {
        success: false,
        summary: `Claude CLI error: ${error}`,
      };
    }
  }

  /**
   * Complete task - move to VERIFICATION for human review
   */
  private async completeTask(task: Task, summary: string): Promise<void> {
    try {
      await this.client.tasks.update(task.id, this.config.workspaceId, {
        status: TaskStatus.VERIFICATION,
      });

      await this.client.tasks.addComment(task.id, this.config.workspaceId, {
        author: this.config.agentId,
        text: `✅ Task completed by agent\n\n${summary}`,
      });

      this.tasksCompleted += 1;
      this.consecutiveEmpty = 0;

      this.log(`Completed: ${task.title}`, "success");
      this.log(
        `Progress: ${this.tasksCompleted} completed, ${this.tasksFailed} failed`,
        "info"
      );
    } catch (error) {
      this.log(`Error completing task: ${error}`, "error");
    }
  }

  /**
   * Fail task - move back to BACKLOG so another agent can pick it up
   */
  private async failTask(task: Task, error: string): Promise<void> {
    try {
      await this.client.tasks.update(task.id, this.config.workspaceId, {
        status: TaskStatus.BACKLOG,
        assignedTo: null,
      });

      await this.client.tasks.addComment(task.id, this.config.workspaceId, {
        author: this.config.agentId,
        text: `❌ Task failed\n\nError: ${error}`,
      });

      this.tasksFailed += 1;
      this.log(`Failed: ${task.title} - ${error}`, "error");
    } catch (err) {
      this.log(`Error failing task: ${err}`, "error");
    }
  }

  /**
   * Main agent loop
   */
  async run(): Promise<void> {
    this.log(`Agent started`, "success");
    this.log(`Skills: ${this.config.skills.join(", ")}`, "info");
    this.log(`Workspace: ${this.config.workspaceId}`, "info");
    if (this.config.sprintId) {
      this.log(`Sprint: ${this.config.sprintId}`, "info");
    }
    console.log("");

    while (
      this.tasksCompleted < this.maxTasks &&
      this.consecutiveEmpty < this.maxEmpty
    ) {
      // Poll for next task
      const task = await this.getNextTask();

      if (!task) {
        this.consecutiveEmpty += 1;
        this.log(
          `No tasks available (${this.consecutiveEmpty}/${this.maxEmpty} polls)`,
          "warn"
        );

        if (this.consecutiveEmpty >= this.maxEmpty) {
          this.log("Max empty polls reached, stopping", "info");
          break;
        }

        await this.sleep(this.pollInterval);
        continue;
      }

      this.consecutiveEmpty = 0;

      // Try to claim the task
      const claimed = await this.claimTask(task);
      if (!claimed) {
        this.log("Failed to claim task, trying another", "warn");
        await this.sleep(1000);
        continue;
      }

      this.log(`Claimed: ${task.title}`, "success");

      // Execute the task
      try {
        const result = await this.executeTask(task);

        if (result.success) {
          await this.completeTask(task, result.summary);
        } else {
          await this.failTask(task, "Execution returned failure");
        }
      } catch (error) {
        await this.failTask(task, String(error));
      }

      // Brief pause between tasks
      await this.sleep(500);
    }

    console.log("");
    this.log(`Agent finished`, "success");
    this.log(`Tasks completed: ${this.tasksCompleted}`, "info");
    this.log(`Tasks failed: ${this.tasksFailed}`, "info");

    process.exit(0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Parse command line arguments
 */
function parseConfig(): WorkerConfig {
  const { values } = parseArgs({
    options: {
      "agent-id": { type: "string" },
      "workspace-id": { type: "string" },
      "sprint-id": { type: "string" },
      skills: { type: "string" },
      "api-base": { type: "string" },
      "api-key": { type: "string" },
      "mcp-project": { type: "string" },
    },
    strict: true,
  });

  const agentId = values["agent-id"];
  const workspaceId = values["workspace-id"];
  const sprintId = values["sprint-id"];
  const apiKey = values["api-key"];

  if (!agentId || !workspaceId || !apiKey) {
    console.error(
      "Missing required arguments: --agent-id, --workspace-id, --api-key"
    );
    process.exit(1);
  }

  return {
    agentId,
    workspaceId,
    sprintId: sprintId || undefined,
    skills: (values.skills || "").split(",").filter(Boolean),
    apiBase: values["api-base"] || "https://api.locus.dev/api",
    mcpProjectPath: values["mcp-project"] || "",
    apiKey,
  };
}

/**
 * Main entry point
 */
async function main() {
  try {
    const config = parseConfig();
    const worker = new AgentWorker(config);
    await worker.run();
  } catch (error) {
    console.error("Agent error:", error);
    process.exit(1);
  }
}

main();
