import { execFileSync } from "node:child_process";
import type { Task } from "@locusai/shared";
import type { LogFn } from "../ai/factory.js";
import {
  detectRemoteProvider,
  getDefaultBranch,
  isGhAvailable,
} from "./git-utils.js";

export interface CreatePrOptions {
  task: Task;
  branch: string;
  baseBranch?: string;
  agentId: string;
  summary?: string;
}

export interface PrResult {
  url: string;
  number: number;
}

/**
 * Creates and manages pull requests via the `gh` CLI.
 * Requires the GitHub CLI (`gh`) to be installed and authenticated.
 */
export class PrService {
  constructor(
    private projectPath: string,
    private log: LogFn
  ) {}

  /**
   * Create a pull request for a completed task.
   * Returns the PR URL and number.
   */
  createPr(options: CreatePrOptions): PrResult {
    const {
      task,
      branch,
      baseBranch: requestedBaseBranch,
      agentId,
      summary,
    } = options;

    const provider = detectRemoteProvider(this.projectPath);
    if (provider !== "github") {
      throw new Error(
        `PR creation is only supported for GitHub repositories (detected: ${provider})`
      );
    }

    if (!isGhAvailable(this.projectPath)) {
      throw new Error(
        "GitHub CLI (gh) is not installed or not authenticated. Install from https://cli.github.com/"
      );
    }

    const title = `[Locus] ${task.title}`;
    const body = this.buildPrBody(task, agentId, summary);
    const baseBranch =
      requestedBaseBranch ?? getDefaultBranch(this.projectPath);
    this.validateCreatePrInputs(baseBranch, branch);

    this.log(`Creating PR: ${title} (${branch} → ${baseBranch})`, "info");

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
        baseBranch,
        "--head",
        branch,
      ],
      {
        cwd: this.projectPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    // gh pr create outputs the PR URL
    const url = output;
    const prNumber = this.extractPrNumber(url);

    this.log(`PR created: ${url}`, "success");

    return { url, number: prNumber };
  }

  private validateCreatePrInputs(baseBranch: string, headBranch: string): void {
    if (!this.hasRemoteBranch(baseBranch)) {
      throw new Error(
        `Base branch "${baseBranch}" does not exist on origin. Push/fetch refs and retry.`
      );
    }

    if (!this.hasRemoteBranch(headBranch)) {
      throw new Error(
        `Head branch "${headBranch}" is not available on origin. Ensure it is pushed before PR creation.`
      );
    }

    const baseRef = this.resolveBranchRef(baseBranch);
    const headRef = this.resolveBranchRef(headBranch);

    if (!baseRef) {
      throw new Error(`Could not resolve base branch "${baseBranch}" locally.`);
    }

    if (!headRef) {
      throw new Error(`Could not resolve head branch "${headBranch}" locally.`);
    }

    const commitsAhead = this.countCommitsAhead(baseRef, headRef);
    if (commitsAhead <= 0) {
      throw new Error(
        `No commits between "${baseBranch}" and "${headBranch}". Skipping PR creation.`
      );
    }
  }

  private countCommitsAhead(baseRef: string, headRef: string): number {
    const output = execFileSync(
      "git",
      ["rev-list", "--count", `${baseRef}..${headRef}`],
      {
        cwd: this.projectPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();

    const value = Number.parseInt(output || "0", 10);
    return Number.isNaN(value) ? 0 : value;
  }

  private resolveBranchRef(branch: string): string | null {
    if (this.hasLocalBranch(branch)) {
      return branch;
    }

    if (this.hasRemoteTrackingBranch(branch)) {
      return `origin/${branch}`;
    }

    return null;
  }

  private hasLocalBranch(branch: string): boolean {
    try {
      execFileSync(
        "git",
        ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
        {
          cwd: this.projectPath,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  private hasRemoteTrackingBranch(branch: string): boolean {
    try {
      execFileSync(
        "git",
        ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`],
        {
          cwd: this.projectPath,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  private hasRemoteBranch(branch: string): boolean {
    try {
      execFileSync(
        "git",
        ["ls-remote", "--exit-code", "--heads", "origin", branch],
        {
          cwd: this.projectPath,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the diff for a PR by branch name.
   */
  getPrDiff(branch: string): string {
    return execFileSync("gh", ["pr", "diff", branch], {
      cwd: this.projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  /**
   * Post a review on a PR.
   */
  submitReview(
    prIdentifier: string,
    body: string,
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
  ): void {
    try {
      execFileSync(
        "gh",
        [
          "pr",
          "review",
          prIdentifier,
          "--body",
          body,
          `--${event.toLowerCase().replace("_", "-")}`,
        ],
        {
          cwd: this.projectPath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
    } catch (err) {
      // GitHub doesn't allow REQUEST_CHANGES on your own PR — fall back to COMMENT
      const msg = err instanceof Error ? err.message : String(err);
      if (event === "REQUEST_CHANGES" && msg.includes("own pull request")) {
        execFileSync(
          "gh",
          [
            "pr",
            "review",
            prIdentifier,
            "--body",
            body,
            "--comment",
          ],
          {
            cwd: this.projectPath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        );
        return;
      }
      throw err;
    }
  }

  /**
   * List open PRs created by Locus agents.
   */
  listLocusPrs(): Array<{
    number: number;
    title: string;
    url: string;
    branch: string;
  }> {
    try {
      const output = execFileSync(
        "gh",
        [
          "pr",
          "list",
          "--search",
          "[Locus] in:title",
          "--state",
          "open",
          "--json",
          "number,title,url,headRefName",
        ],
        {
          cwd: this.projectPath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      ).trim();

      const prs = JSON.parse(output || "[]") as Array<{
        number: number;
        title: string;
        url: string;
        headRefName: string;
      }>;

      return prs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        branch: pr.headRefName,
      }));
    } catch {
      this.log("Failed to list Locus PRs", "warn");
      return [];
    }
  }

  /**
   * Check if a PR already has a Locus agent review comment.
   */
  hasLocusReview(prNumber: string): boolean {
    try {
      const output = execFileSync(
        "gh",
        ["pr", "view", prNumber, "--json", "reviews"],
        {
          cwd: this.projectPath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      ).trim();

      const data = JSON.parse(output || "{}") as {
        reviews?: Array<{ body?: string }>;
      };

      return (
        data.reviews?.some((r) => r.body?.includes("## Locus Agent Review")) ??
        false
      );
    } catch {
      return false;
    }
  }

  /**
   * List open Locus PRs that have not yet been reviewed by a Locus agent.
   */
  listUnreviewedLocusPrs(): Array<{
    number: number;
    title: string;
    url: string;
    branch: string;
  }> {
    const allPrs = this.listLocusPrs();
    return allPrs.filter((pr) => !this.hasLocusReview(String(pr.number)));
  }

  private buildPrBody(task: Task, agentId: string, summary?: string): string {
    const sections: string[] = [];

    sections.push(`## Task: ${task.title}`);
    sections.push("");

    if (task.description) {
      sections.push(task.description);
      sections.push("");
    }

    if (task.acceptanceChecklist?.length > 0) {
      sections.push("## Acceptance Criteria");
      for (const item of task.acceptanceChecklist) {
        sections.push(`- [ ] ${item.text}`);
      }
      sections.push("");
    }

    if (summary) {
      sections.push("## Agent Summary");
      sections.push(summary);
      sections.push("");
    }

    sections.push("---");
    sections.push(
      `*Created by Locus Agent \`${agentId.slice(-8)}\`* | Task ID: \`${task.id}\``
    );

    return sections.join("\n");
  }

  private extractPrNumber(url: string): number {
    const match = url.match(/\/pull\/(\d+)/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }
}
