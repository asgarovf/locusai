import { execFileSync } from "node:child_process";
import type { Task } from "@locusai/shared";
import type { LogFn } from "../ai/factory.js";
import {
  detectRemoteProvider,
  getDefaultBranch,
  getGhUsername,
  isGhAvailable,
} from "../git/git-utils.js";
import type { CommitPushResult, WorkerConfig } from "./worker-types.js";

/**
 * Handles the git side of task execution with a single-branch workflow:
 * - Creates one branch for the entire run
 * - Commits and pushes after each task
 * - Opens a PR when all tasks are done
 * - Checks out the base branch after PR creation
 */
export class GitWorkflow {
  private projectPath: string;
  private branchName: string | null = null;
  private baseBranch: string | null = null;
  private ghUsername: string | null;

  constructor(
    private config: WorkerConfig,
    private log: LogFn
  ) {
    this.projectPath = config.projectPath || process.cwd();
    this.ghUsername = getGhUsername();
    if (this.ghUsername) {
      this.log(`GitHub user: ${this.ghUsername}`, "info");
    }
  }

  /**
   * Create a development branch for the run.
   * Called once at the start of execution.
   */
  createBranch(sprintId?: string): string {
    const defaultBranch = getDefaultBranch(this.projectPath);
    this.baseBranch = defaultBranch;

    // Ensure we're on the base branch and up to date
    try {
      this.gitExec(["checkout", defaultBranch]);
      this.gitExec(["pull", "origin", defaultBranch]);
    } catch {
      this.log(
        `Could not pull latest from ${defaultBranch}, continuing with current state`,
        "warn"
      );
    }

    // Generate branch name
    const suffix = sprintId ? sprintId.slice(0, 8) : Date.now().toString(36);
    this.branchName = `locus/${suffix}`;

    // Delete existing branch if it exists (from a previous run)
    try {
      this.gitExec(["branch", "-D", this.branchName]);
    } catch {
      // Branch may not exist
    }

    // Create and checkout the new branch
    this.gitExec(["checkout", "-b", this.branchName]);
    this.log(
      `Created branch: ${this.branchName} (from ${defaultBranch})`,
      "success"
    );

    return this.branchName;
  }

  /**
   * Commit changes for a completed task and push to remote.
   */
  commitAndPush(task: Task): CommitPushResult {
    if (!this.branchName) {
      this.log("No branch created yet, skipping commit", "warn");
      return { branch: null, pushed: false, pushFailed: false };
    }

    try {
      // Check for changes
      const status = this.gitExec(["status", "--porcelain"]).trim();
      if (!status) {
        // Check if AI committed changes directly
        const baseBranchCommit = this.getBaseCommit();
        const headCommit = this.gitExec(["rev-parse", "HEAD"]).trim();
        if (baseBranchCommit && headCommit !== baseBranchCommit) {
          // AI made commits directly, just push
          return this.pushBranch();
        }
        this.log("No changes to commit for this task", "info");
        return {
          branch: this.branchName,
          pushed: false,
          pushFailed: false,
          noChanges: true,
          skipReason: "No changes were made for this task.",
        };
      }

      // Stage all changes
      this.gitExec(["add", "-A"]);

      // Check if anything is staged
      const staged = this.gitExec(["diff", "--cached", "--name-only"]).trim();
      if (!staged) {
        this.log(
          "All changes were ignored by .gitignore — nothing to commit",
          "warn"
        );
        return {
          branch: this.branchName,
          pushed: false,
          pushFailed: false,
          noChanges: true,
          skipReason: "All changes were ignored by .gitignore.",
        };
      }

      this.log(
        `Staging ${staged.split("\n").length} file(s) for commit`,
        "info"
      );

      // Build commit message
      const trailers: string[] = [
        `Task-ID: ${task.id}`,
        `Agent: ${this.config.agentId}`,
        "Co-authored-by: LocusAI <agent@locusai.team>",
      ];
      if (this.ghUsername) {
        trailers.push(
          `Co-authored-by: ${this.ghUsername} <${this.ghUsername}@users.noreply.github.com>`
        );
      }
      const commitMessage = `feat(agent): ${task.title}\n\n${trailers.join("\n")}`;

      this.gitExec(["commit", "-m", commitMessage]);
      const hash = this.gitExec(["rev-parse", "HEAD"]).trim();
      this.log(`Committed: ${hash.slice(0, 8)}`, "success");

      // Push to remote
      return this.pushBranch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log(`Git commit failed: ${errorMessage}`, "error");
      return {
        branch: this.branchName,
        pushed: false,
        pushFailed: true,
        pushError: `Git commit/push failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Push the current branch to remote.
   */
  private pushBranch(): CommitPushResult {
    if (!this.branchName) {
      return { branch: null, pushed: false, pushFailed: false };
    }

    try {
      this.gitExec(["push", "-u", "origin", this.branchName]);
      this.log(`Pushed ${this.branchName} to origin`, "success");
      return { branch: this.branchName, pushed: true, pushFailed: false };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("non-fast-forward") ||
        msg.includes("[rejected]") ||
        msg.includes("fetch first")
      ) {
        this.log(
          `Push rejected (non-fast-forward). Retrying with --force-with-lease.`,
          "warn"
        );
        try {
          this.gitExec([
            "push",
            "--force-with-lease",
            "-u",
            "origin",
            this.branchName,
          ]);
          this.log(
            `Pushed ${this.branchName} to origin with --force-with-lease`,
            "success"
          );
          return { branch: this.branchName, pushed: true, pushFailed: false };
        } catch (retryErr) {
          const retryMsg =
            retryErr instanceof Error ? retryErr.message : String(retryErr);
          this.log(`Git push retry failed: ${retryMsg}`, "error");
          return {
            branch: this.branchName,
            pushed: false,
            pushFailed: true,
            pushError: retryMsg,
          };
        }
      }
      this.log(`Git push failed: ${msg}`, "error");
      return {
        branch: this.branchName,
        pushed: false,
        pushFailed: true,
        pushError: msg,
      };
    }
  }

  /**
   * Create a pull request for the development branch.
   * Called once after all tasks are done.
   */
  createPullRequest(
    completedTasks: Array<{ title: string; id: string }>,
    summaries: string[]
  ): { url: string | null; error?: string } {
    if (!this.branchName || !this.baseBranch) {
      return { url: null, error: "No branch or base branch available." };
    }

    const provider = detectRemoteProvider(this.projectPath);
    if (provider !== "github") {
      return {
        url: null,
        error: `PR creation is only supported for GitHub repositories (detected: ${provider})`,
      };
    }

    if (!isGhAvailable(this.projectPath)) {
      return {
        url: null,
        error:
          "GitHub CLI (gh) is not installed or not authenticated. Install from https://cli.github.com/",
      };
    }

    const title = `[Locus] Sprint tasks (${completedTasks.length} task${completedTasks.length !== 1 ? "s" : ""})`;
    const body = this.buildPrBody(completedTasks, summaries);

    this.log(
      `Creating PR: ${title} (${this.branchName} → ${this.baseBranch})`,
      "info"
    );

    try {
      const output = execFileSync(
        "gh",
        [
          "pr",
          "create",
          "--title",
          title,
          "--body",
          body,
          "--base",
          this.baseBranch,
          "--head",
          this.branchName,
        ],
        {
          cwd: this.projectPath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      ).trim();

      this.log(`PR created: ${output}`, "success");
      return { url: output };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log(`PR creation failed: ${errorMessage}`, "error");
      return { url: null, error: errorMessage };
    }
  }

  /**
   * Checkout the base branch after the run is complete.
   */
  checkoutBaseBranch(): void {
    if (!this.baseBranch) return;

    try {
      this.gitExec(["checkout", this.baseBranch]);
      this.log(`Checked out base branch: ${this.baseBranch}`, "info");
    } catch (err) {
      this.log(
        `Could not checkout base branch: ${err instanceof Error ? err.message : String(err)}`,
        "warn"
      );
    }
  }

  /**
   * Get the current branch name.
   */
  getBranchName(): string | null {
    return this.branchName;
  }

  /**
   * Get the base branch name.
   */
  getBaseBranch(): string | null {
    return this.baseBranch;
  }

  private getBaseCommit(): string | null {
    if (!this.baseBranch) return null;
    try {
      return this.gitExec(["rev-parse", this.baseBranch]).trim();
    } catch {
      return null;
    }
  }

  private buildPrBody(
    completedTasks: Array<{ title: string; id: string }>,
    summaries: string[]
  ): string {
    const sections: string[] = [];

    sections.push("## Completed Tasks");
    sections.push("");

    for (let i = 0; i < completedTasks.length; i++) {
      const task = completedTasks[i];
      sections.push(`### ${i + 1}. ${task.title}`);
      sections.push(`Task ID: \`${task.id}\``);
      if (summaries[i]) {
        sections.push("");
        sections.push(summaries[i]);
      }
      sections.push("");
    }

    sections.push("---");
    sections.push(
      `*Created by Locus Agent \`${this.config.agentId.slice(-8)}\`*`
    );

    return sections.join("\n");
  }

  private gitExec(args: string[]): string {
    return execFileSync("git", args, {
      cwd: this.projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}
