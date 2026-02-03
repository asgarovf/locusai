import { execSync } from "node:child_process";
import type { Sprint } from "@locusai/shared";
import { LogFn } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";

export interface ReviewServiceDeps {
  aiRunner: AiRunner;
  projectPath: string;
  log: LogFn;
}

/**
 * Reviews staged git changes and produces a markdown report.
 */
export class ReviewService {
  constructor(private deps: ReviewServiceDeps) {}

  /**
   * Stages all changes and runs an AI review on the diff.
   * Returns a markdown review report, or null if there are no changes.
   */
  async reviewStagedChanges(sprint: Sprint | null): Promise<string | null> {
    const { projectPath, log } = this.deps;

    // Stage all current changes
    try {
      execSync("git add -A", { cwd: projectPath, stdio: "pipe" });
      log("Staged all changes for review.", "info");
    } catch (err) {
      log(
        `Failed to stage changes: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
      return null;
    }

    // Get the staged diff
    let diff: string;
    try {
      diff = execSync("git diff --cached --stat && echo '---' && git diff --cached", {
        cwd: projectPath,
        maxBuffer: 10 * 1024 * 1024,
      }).toString();
    } catch (err) {
      log(
        `Failed to get staged diff: ${err instanceof Error ? err.message : String(err)}`,
        "error"
      );
      return null;
    }

    if (!diff.trim()) {
      return null;
    }

    const sprintInfo = sprint
      ? `Sprint: ${sprint.name} (${sprint.id})`
      : "No active sprint";

    const reviewPrompt = `# Code Review Request

## Context
${sprintInfo}
Date: ${new Date().toISOString()}

## Staged Changes (git diff)
\`\`\`diff
${diff}
\`\`\`

## Instructions
You are reviewing the staged changes at the end of a sprint. Produce a thorough markdown review report with the following sections:

1. **Summary** — Brief overview of what changed and why.
2. **Files Changed** — List each file with a short description of changes.
3. **Code Quality** — Note any code quality concerns (naming, structure, complexity).
4. **Potential Issues** — Identify bugs, security issues, edge cases, or regressions.
5. **Recommendations** — Actionable suggestions for improvement.
6. **Overall Assessment** — A short verdict (e.g., "Looks good", "Needs attention", "Critical issues found").

Keep the review concise but thorough. Focus on substance over style.
Do NOT output <promise>COMPLETE</promise> — just output the review report as markdown.`;

    log("Running AI review on staged changes...", "info");
    const report = await this.deps.aiRunner.run(reviewPrompt);
    return report;
  }
}
