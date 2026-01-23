import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { Sprint, Task, TaskStatus } from "@locusai/shared";
import { AnthropicClient } from "./anthropic-client";
import { ClaudeRunner } from "./claude-runner";
import { getLocusPath } from "./config";
import { LocusClient } from "./index";
import { PromptBuilder } from "./prompt-builder";

interface WorkerConfig {
  agentId: string;
  workspaceId: string;
  sprintId?: string;
  apiBase: string;
  projectPath: string;
  apiKey: string;
  anthropicApiKey?: string;
  model?: string;
}

export class AgentWorker {
  private client: LocusClient;
  private promptBuilder: PromptBuilder;
  private claudeRunner: ClaudeRunner;
  private anthropicClient: AnthropicClient | null;
  private consecutiveEmpty = 0;
  private maxEmpty = 10;
  private maxTasks = 50;
  private tasksCompleted = 0;
  private pollInterval = 10_000;
  private sprintPlan: string | null = null;

  constructor(private config: WorkerConfig) {
    const projectPath = config.projectPath || process.cwd();
    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
    });
    this.promptBuilder = new PromptBuilder(projectPath);
    this.claudeRunner = new ClaudeRunner(projectPath, config.model);

    // Only initialize Anthropic client if API key is provided
    this.anthropicClient = config.anthropicApiKey
      ? new AnthropicClient({
          apiKey: config.anthropicApiKey,
          model: config.model,
        })
      : null;

    if (this.anthropicClient) {
      this.log(
        "Using Anthropic SDK with prompt caching for planning phases",
        "info"
      );
    } else {
      this.log(
        "Using Claude CLI for all phases (no Anthropic API key provided)",
        "info"
      );
    }
  }

  log(message: string, level: "info" | "success" | "warn" | "error" = "info") {
    const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8) ?? "";
    const prefix = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" }[level];
    console.log(
      `[${timestamp}] [${this.config.agentId.slice(-8)}] ${prefix} ${message}`
    );
  }

  private async getActiveSprint(): Promise<Sprint | null> {
    try {
      if (this.config.sprintId) {
        return await this.client.sprints.getById(
          this.config.sprintId,
          this.config.workspaceId
        );
      }
      return await this.client.sprints.getActive(this.config.workspaceId);
    } catch (_error) {
      return null;
    }
  }

  private async planSprint(sprint: Sprint, tasks: Task[]): Promise<string> {
    this.log(`Planning sprint: ${sprint.name}`, "info");

    const taskList = tasks
      .map(
        (t) => `- [${t.id}] ${t.title}: ${t.description || "No description"}`
      )
      .join("\n");

    let plan: string;

    if (this.anthropicClient) {
      // Use Anthropic SDK with caching for faster planning
      const systemPrompt = `You are an expert project manager and lead engineer specialized in sprint planning and task prioritization.`;

      const userPrompt = `# Sprint Planning: ${sprint.name}

## Tasks
${taskList}

## Instructions
1. Analyze dependencies between these tasks.
2. Prioritize them for the most efficient execution.
3. Create a mindmap (in Markdown or Mermaid format) that visualizes the sprint structure.
4. Output your final plan. The plan should clearly state the order of execution.

**IMPORTANT**: 
- Do NOT create any files on the filesystem during this planning phase. 
- Avoid using absolute local paths (e.g., /Users/...) in your output. Use relative paths starting from the project root if necessary.
- Your output will be saved as the official sprint mindmap on the server.`;

      plan = await this.anthropicClient.run({
        systemPrompt,
        userPrompt,
      });
    } else {
      // Fallback to Claude CLI
      const planningPrompt = `# Sprint Planning: ${sprint.name}

You are an expert project manager and lead engineer. You need to create a mindmap and execution plan for the following tasks in this sprint.

## Tasks
${taskList}

## Instructions
1. Analyze dependencies between these tasks.
2. Prioritize them for the most efficient execution.
3. Create a mindmap (in Markdown or Mermaid format) that visualizes the sprint structure.
4. Output your final plan. The plan should clearly state the order of execution.

**IMPORTANT**: 
- Do NOT create any files on the filesystem during this planning phase. 
- Avoid using absolute local paths (e.g., /Users/...) in your output. Use relative paths starting from the project root if necessary.
- Your output will be saved as the official sprint mindmap on the server.`;

      plan = await this.claudeRunner.run(planningPrompt, true);
    }

    // Save mindmap to server
    await this.client.sprints.update(sprint.id, this.config.workspaceId, {
      mindmap: plan,
      mindmapUpdatedAt: new Date(),
    });

    this.log("Sprint mindmap generated and posted to server.", "success");
    return plan;
  }

  private async getNextTask(): Promise<Task | null> {
    try {
      // If we have a plan, we should ideally pick the next task based on it.
      // For now, we still use the dispatch endpoint which picks the highest priority task,
      // but the planning phase (planSprint) can be used to re-prioritize tasks in the DB
      // if we wanted to be even smarter.
      const task = await this.client.workspaces.dispatch(
        this.config.workspaceId,
        this.config.agentId,
        this.config.sprintId
      );
      return task;
    } catch (error) {
      this.log(
        `No task dispatched: ${error instanceof Error ? error.message : String(error)}`,
        "info"
      );
      return null;
    }
  }

  private async syncArtifacts(): Promise<void> {
    const artifactsDir = getLocusPath(this.config.projectPath, "artifactsDir");
    if (!existsSync(artifactsDir)) {
      mkdirSync(artifactsDir, { recursive: true });
      return;
    }

    try {
      const files = readdirSync(artifactsDir);
      if (files.length === 0) return;

      this.log(`Syncing ${files.length} artifacts to server...`, "info");

      // Get existing docs to check for updates
      const existingDocs = await this.client.docs.list(this.config.workspaceId);

      for (const file of files) {
        const filePath = join(artifactsDir, file);
        if (statSync(filePath).isFile()) {
          const content = readFileSync(filePath, "utf-8");
          const title = file.replace(/\.md$/, "").trim();
          if (!title) continue;

          const existing = existingDocs.find((d) => d.title === title);

          if (existing) {
            if (existing.content !== content) {
              await this.client.docs.update(
                existing.id,
                this.config.workspaceId,
                { content }
              );
              this.log(`Updated artifact: ${file}`, "success");
            }
          } else {
            await this.client.docs.create(this.config.workspaceId, {
              title,
              content,
            });
            this.log(`Created artifact: ${file}`, "success");
          }
        }
      }
    } catch (error) {
      this.log(`Failed to sync artifacts: ${error}`, "error");
    }
  }

  private async executeTask(
    task: Task
  ): Promise<{ success: boolean; summary: string }> {
    // Fetch full task details to get comments/feedback
    const fullTask = await this.client.tasks.getById(
      task.id,
      this.config.workspaceId
    );

    this.log(`Executing: ${fullTask.title}`, "info");
    let basePrompt = await this.promptBuilder.build(fullTask);

    if (this.sprintPlan) {
      basePrompt = `## Sprint Context\n${this.sprintPlan}\n\n${basePrompt}`;
    }

    try {
      let plan: string;

      if (this.anthropicClient) {
        // Phase 1: Planning (using Anthropic SDK with caching)
        this.log("Phase 1: Planning (Anthropic SDK)...", "info");

        // Build cacheable context blocks
        const cacheableContext: string[] = [basePrompt];

        plan = await this.anthropicClient.run({
          systemPrompt:
            "You are an expert software engineer. Analyze the task carefully and create a detailed implementation plan.",
          cacheableContext,
          userPrompt:
            "## Phase 1: Planning\nAnalyze and create a detailed plan for THIS SPECIFIC TASK. Do NOT execute changes yet.",
        });
      } else {
        // Phase 1: Planning (using Claude CLI)
        this.log("Phase 1: Planning (Claude CLI)...", "info");
        const planningPrompt = `${basePrompt}\n\n## Phase 1: Planning\nAnalyze and create a detailed plan for THIS SPECIFIC TASK. Do NOT execute changes yet.`;
        plan = await this.claudeRunner.run(planningPrompt, true);
      }

      // Phase 2: Execution (always using Claude CLI for agentic tools)
      this.log("Plan generated. Starting Phase 2: Execution...", "info");
      const executionPrompt = `${basePrompt}\n\n## Phase 2: Execution\nBased on the plan, execute the task:\n\n${plan}\n\nWhen finished, output: <promise>COMPLETE</promise>`;
      const output = await this.claudeRunner.run(executionPrompt);

      const success = output.includes("<promise>COMPLETE</promise>");
      if (success && task.acceptanceChecklist) {
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          acceptanceChecklist: task.acceptanceChecklist.map((i) => ({
            ...i,
            done: true,
          })),
        });
      }

      return {
        success,
        summary: success
          ? "Task completed by Claude"
          : "Claude did not signal completion",
      };
    } catch (error) {
      return { success: false, summary: `Error: ${error}` };
    }
  }

  async run(): Promise<void> {
    this.log(
      `Agent started in ${this.config.projectPath || process.cwd()}`,
      "success"
    );

    // Initial Sprint Planning Phase
    const sprint = await this.getActiveSprint();
    if (sprint) {
      this.log(`Found active sprint: ${sprint.name} (${sprint.id})`, "info");
      const tasks = await this.client.tasks.list(this.config.workspaceId, {
        sprintId: sprint.id,
      });

      this.log(`Sprint tasks found: ${tasks.length}`, "info");

      const latestTaskCreation = tasks.reduce((latest, task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate > latest ? taskDate : latest;
      }, new Date(0));

      const mindmapDate = sprint.mindmapUpdatedAt
        ? new Date(sprint.mindmapUpdatedAt)
        : new Date(0);

      const needsPlanning =
        !sprint.mindmap ||
        sprint.mindmap.trim() === "" ||
        latestTaskCreation > mindmapDate;

      if (needsPlanning) {
        if (sprint.mindmap && latestTaskCreation > mindmapDate) {
          this.log(
            "New tasks have been added to the sprint since last mindmap. Regenerating...",
            "warn"
          );
        }
        this.sprintPlan = await this.planSprint(sprint, tasks);
      } else {
        this.log("Using existing sprint mindmap.", "info");
        this.sprintPlan = sprint.mindmap ?? null;
      }
    } else {
      this.log("No active sprint found for planning.", "warn");
    }

    while (
      this.tasksCompleted < this.maxTasks &&
      this.consecutiveEmpty < this.maxEmpty
    ) {
      const task = await this.getNextTask();
      if (!task) {
        this.consecutiveEmpty++;
        if (this.consecutiveEmpty >= this.maxEmpty) break;
        await new Promise((r) => setTimeout(r, this.pollInterval));
        continue;
      }

      this.consecutiveEmpty = 0;
      this.log(`Claimed: ${task.title}`, "success");

      const result = await this.executeTask(task);

      // Sync artifacts after task execution
      await this.syncArtifacts();

      if (result.success) {
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: TaskStatus.VERIFICATION,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `✅ ${result.summary}`,
        });
        this.tasksCompleted++;
      } else {
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: TaskStatus.BACKLOG,
          assignedTo: null,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `❌ ${result.summary}`,
        });
      }
    }
    process.exit(0);
  }
}

if (process.argv[1]?.includes("agent-worker")) {
  const args = process.argv.slice(2);
  const config: Partial<WorkerConfig> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--agent-id") config.agentId = args[++i];
    else if (arg === "--workspace-id") config.workspaceId = args[++i];
    else if (arg === "--sprint-id") config.sprintId = args[++i];
    else if (arg === "--api-base") config.apiBase = args[++i];
    else if (arg === "--api-key") config.apiKey = args[++i];
    else if (arg === "--anthropic-api-key") config.anthropicApiKey = args[++i];
    else if (arg === "--project-path") config.projectPath = args[++i];
    else if (arg === "--model") config.model = args[++i];
  }

  if (
    !config.agentId ||
    !config.workspaceId ||
    !config.apiBase ||
    !config.apiKey ||
    !config.projectPath
  ) {
    console.error("Missing required arguments");
    process.exit(1);
  }

  const worker = new AgentWorker(config as WorkerConfig);
  worker.run().catch((err) => {
    console.error("Fatal worker error:", err);
    process.exit(1);
  });
}
