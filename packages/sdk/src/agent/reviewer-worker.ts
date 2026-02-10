import { Task, TaskStatus } from "@locusai/shared";
import { createAiRunner } from "../ai/factory.js";
import type { AiProvider, AiRunner } from "../ai/runner.js";
import { PROVIDER } from "../core/config.js";
import { isGhAvailable } from "../git/git-utils.js";
import { PrService } from "../git/pr-service.js";
import { LocusClient } from "../index.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import { c } from "../utils/colors.js";

function resolveProvider(value: string | undefined): AiProvider {
  if (!value || value.startsWith("--")) return PROVIDER.CLAUDE;
  if (value === PROVIDER.CLAUDE || value === PROVIDER.CODEX) return value;
  return PROVIDER.CLAUDE;
}

export interface ReviewerConfig {
  agentId: string;
  workspaceId: string;
  sprintId?: string;
  apiBase: string;
  projectPath: string;
  apiKey: string;
  model?: string;
  provider?: AiProvider;
}

/**
 * Reviewer agent that polls for tasks in PR_OPEN status,
 * reviews the PR diff via AI, and posts review comments.
 */
export class ReviewerWorker {
  private client: LocusClient;
  private aiRunner: AiRunner;
  private prService: PrService;
  private knowledgeBase: KnowledgeBase;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentTaskId: string | null = null;
  private maxReviews = 50;
  private reviewsCompleted = 0;

  constructor(private config: ReviewerConfig) {
    const projectPath = config.projectPath || process.cwd();

    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
      retryOptions: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        factor: 2,
      },
    });

    const log = this.log.bind(this);
    const provider = config.provider ?? PROVIDER.CLAUDE;
    this.aiRunner = createAiRunner(provider, {
      projectPath,
      model: config.model,
      log,
    });

    this.prService = new PrService(projectPath, log);
    this.knowledgeBase = new KnowledgeBase(projectPath);

    const providerLabel = provider === "codex" ? "Codex" : "Claude";
    this.log(`Reviewer agent using ${providerLabel} CLI`, "info");
  }

  log(message: string, level: "info" | "success" | "warn" | "error" = "info") {
    const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8) ?? "";
    const colorFn = {
      info: c.cyan,
      success: c.green,
      warn: c.yellow,
      error: c.red,
    }[level];
    const prefix = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" }[level];

    console.log(
      `${c.dim(`[${timestamp}]`)} ${c.bold(`[R:${this.config.agentId.slice(-8)}]`)} ${colorFn(`${prefix} ${message}`)}`
    );
  }

  /**
   * Find the next task in PR_OPEN status that needs review.
   */
  private async getNextReviewTask(): Promise<Task | null> {
    try {
      const tasks = await this.client.tasks.list(this.config.workspaceId, {
        sprintId: this.config.sprintId,
        status: TaskStatus.PR_OPEN,
      });

      if (tasks.length === 0) return null;

      // Pick the first PR_OPEN task
      return tasks[0];
    } catch (err) {
      this.log(
        `Failed to fetch review tasks: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
      return null;
    }
  }

  /**
   * Review a PR for a task using AI.
   */
  private async reviewTask(
    task: Task
  ): Promise<{ reviewed: boolean; approved: boolean; summary: string }> {
    if (!task.prUrl) {
      return { reviewed: false, approved: false, summary: "No PR URL on task" };
    }

    // Extract PR branch from the PR URL or use gh to get the diff
    const prNumber = task.prUrl.match(/\/pull\/(\d+)/)?.[1];
    if (!prNumber) {
      return {
        reviewed: false,
        approved: false,
        summary: "Could not extract PR number",
      };
    }

    this.log(`Reviewing PR #${prNumber}: ${task.title}`, "info");

    let diff: string;
    try {
      diff = this.prService.getPrDiff(prNumber);
    } catch (err) {
      return {
        reviewed: false,
        approved: false,
        summary: `Failed to get PR diff: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (!diff.trim()) {
      return {
        reviewed: true,
        approved: true,
        summary: "PR has no changes (empty diff)",
      };
    }

    // Build review prompt
    const checklistSection =
      task.acceptanceChecklist?.length > 0
        ? `## Acceptance Criteria\n${task.acceptanceChecklist.map((c) => `- ${c.text}`).join("\n")}`
        : "";

    const reviewPrompt = `# Code Review Request

## Task: ${task.title}
${task.description || "No description provided."}

${checklistSection}

## PR Diff
\`\`\`diff
${diff.slice(0, 100_000)}
\`\`\`

## Instructions
You are a code reviewer. Review the PR diff above for:

1. **Correctness** — Does the code do what the task requires?
2. **Code Quality** — Naming, structure, complexity, readability.
3. **Potential Issues** — Bugs, security issues, edge cases, regressions.
4. **Acceptance Criteria** — Are the acceptance criteria met?

Output your review in this exact format:

VERDICT: APPROVE or REQUEST_CHANGES

Then provide a concise review with specific findings. Keep it actionable and focused.`;

    const output = await this.aiRunner.run(reviewPrompt);

    const approved = output.includes("VERDICT: APPROVE");
    const summary = output
      .replace(/VERDICT:\s*(APPROVE|REQUEST_CHANGES)\n?/, "")
      .trim();

    // Post review on the PR via gh
    try {
      const event = approved ? "APPROVE" : "REQUEST_CHANGES";
      const reviewBody = `## Locus Agent Review\n\n${summary}`;
      this.prService.submitReview(
        prNumber,
        reviewBody,
        event as "APPROVE" | "REQUEST_CHANGES"
      );
      this.log(
        `Review posted on PR #${prNumber}: ${approved ? "APPROVED" : "CHANGES REQUESTED"}`,
        approved ? "success" : "warn"
      );
    } catch (err) {
      this.log(
        `Failed to post PR review: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
    }

    return { reviewed: true, approved, summary };
  }

  private startHeartbeat(): void {
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 60_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    this.client.workspaces
      .heartbeat(
        this.config.workspaceId,
        this.config.agentId,
        this.currentTaskId,
        this.currentTaskId ? "WORKING" : "IDLE"
      )
      .catch((err) => {
        this.log(
          `Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn"
        );
      });
  }

  async run(): Promise<void> {
    this.log(
      `Reviewer agent started in ${this.config.projectPath || process.cwd()}`,
      "success"
    );

    if (!isGhAvailable(this.config.projectPath)) {
      this.log(
        "GitHub CLI (gh) not available — reviewer agent cannot operate",
        "error"
      );
      process.exit(1);
    }

    const handleShutdown = () => {
      this.log("Received shutdown signal. Aborting...", "warn");
      this.aiRunner.abort();
      this.stopHeartbeat();
      process.exit(1);
    };

    process.on("SIGTERM", handleShutdown);
    process.on("SIGINT", handleShutdown);

    this.startHeartbeat();

    // Main review loop — poll for PR_OPEN tasks
    while (this.reviewsCompleted < this.maxReviews) {
      const task = await this.getNextReviewTask();

      if (!task) {
        // No tasks to review — wait and retry
        this.log("No PRs to review. Waiting 30s...", "info");
        await new Promise((r) => setTimeout(r, 30_000));
        continue;
      }

      this.log(`Claimed for review: ${task.title}`, "success");
      this.currentTaskId = task.id;
      this.sendHeartbeat();

      // Mark task as IN_REVIEW
      await this.client.tasks.update(task.id, this.config.workspaceId, {
        status: TaskStatus.IN_REVIEW,
        assignedTo: this.config.agentId,
      });

      const result = await this.reviewTask(task);

      if (result.reviewed) {
        const status = result.approved ? "APPROVED" : "CHANGES REQUESTED";
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `🔍 Review: ${status}\n\n${result.summary.slice(0, 1000)}`,
        });

        // Update progress.md
        try {
          this.knowledgeBase.updateProgress({
            type: "pr_reviewed",
            title: task.title,
            details: `Review: ${status}`,
          });
        } catch {
          // Non-critical
        }

        this.reviewsCompleted++;
      } else {
        this.log(`Review skipped: ${result.summary}`, "warn");
        // Return task to PR_OPEN so it can be picked up again
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: TaskStatus.PR_OPEN,
          assignedTo: null,
        });
      }

      this.currentTaskId = null;
    }

    this.stopHeartbeat();
    this.client.workspaces
      .heartbeat(
        this.config.workspaceId,
        this.config.agentId,
        null,
        "COMPLETED"
      )
      .catch(() => {
        // Best-effort final heartbeat — ignore errors on shutdown
      });

    process.exit(0);
  }
}

// CLI entry point
const reviewerEntrypoint = process.argv[1]?.split(/[\\/]/).pop();
if (
  reviewerEntrypoint === "reviewer-worker.js" ||
  reviewerEntrypoint === "reviewer-worker.ts"
) {
  process.title = "locus-reviewer";

  const args = process.argv.slice(2);
  const config: Partial<ReviewerConfig> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--agent-id") config.agentId = args[++i];
    else if (arg === "--workspace-id") config.workspaceId = args[++i];
    else if (arg === "--sprint-id") config.sprintId = args[++i];
    else if (arg === "--api-url") config.apiBase = args[++i];
    else if (arg === "--api-key") config.apiKey = args[++i];
    else if (arg === "--project-path") config.projectPath = args[++i];
    else if (arg === "--model") config.model = args[++i];
    else if (arg === "--provider") {
      const value = args[i + 1];
      if (value && !value.startsWith("--")) i++;
      config.provider = resolveProvider(value);
    }
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

  const worker = new ReviewerWorker(config as ReviewerConfig);
  worker.run().catch((err) => {
    console.error("Fatal reviewer error:", err);
    process.exit(1);
  });
}
