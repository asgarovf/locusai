import { execFileSync, execSync } from "node:child_process";
import { c } from "../utils/colors.js";

/** Branch name prefix for tier merge branches */
const TIER_BRANCH_PREFIX = "locus/tier";

/**
 * Manages git operations for tier-based branch merging.
 *
 * After a tier of tasks completes, this service:
 * 1. Finds all pushed task branches belonging to the tier
 * 2. Creates a merge branch that combines them (octopus merge)
 * 3. Pushes the merge branch to remote
 *
 * The resulting merge branch becomes the base for the next tier.
 */
export class TierMergeService {
  /** Map of tier number -> task IDs for branch matching */
  private tierTaskIds: Map<number, string[]> = new Map();

  constructor(
    private projectPath: string,
    private sprintId: string | null
  ) {}

  /**
   * Register task IDs for a tier so we can match branches later.
   */
  registerTierTasks(tasks: Array<{ id: string; tier?: number | null }>): void {
    for (const task of tasks) {
      const tier = task.tier ?? 0;
      const existing = this.tierTaskIds.get(tier);
      if (existing) {
        existing.push(task.id);
      } else {
        this.tierTaskIds.set(tier, [task.id]);
      }
    }
  }

  /**
   * Build the merge branch name for a tier.
   * Includes sprint ID suffix to avoid collisions between sprints.
   */
  tierBranchName(tier: number): string {
    const suffix = this.sprintId ? `-${this.sprintId.slice(0, 8)}` : "";
    return `${TIER_BRANCH_PREFIX}-${tier}${suffix}`;
  }

  /**
   * Check if a branch exists on the remote.
   */
  remoteBranchExists(branch: string): boolean {
    try {
      execFileSync(
        "git",
        ["ls-remote", "--exit-code", "--heads", "origin", branch],
        {
          cwd: this.projectPath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a merge branch that combines all completed task branches for a tier.
   *
   * The merge branch (`locus/tier-N`) starts from the base branch and
   * sequentially merges all task branches from the completed tier.
   * This branch is then pushed to remote so the next tier can use it as a base.
   *
   * Returns the merge branch name, or null if creation failed.
   */
  createMergeBranch(tier: number, baseBranch: string): string | null {
    const mergeBranchName = this.tierBranchName(tier);

    try {
      // Fetch latest from remote to ensure we have all pushed branches
      this.gitExec(["fetch", "origin"]);

      // Collect the pushed task branches for this tier
      const tierTaskBranches = this.findTierTaskBranches(tier);

      if (tierTaskBranches.length === 0) {
        console.log(
          c.dim(
            `   Tier ${tier}: no pushed task branches found, skipping merge branch creation`
          )
        );
        return null;
      }

      console.log(
        c.dim(
          `   Merging ${tierTaskBranches.length} branch(es) into ${mergeBranchName}: ${tierTaskBranches.join(", ")}`
        )
      );

      // Delete existing merge branch if it exists (from a previous run)
      try {
        this.gitExec(["branch", "-D", mergeBranchName]);
      } catch {
        // Branch may not exist
      }

      // Create the merge branch from the base
      this.gitExec(["checkout", "-b", mergeBranchName, `origin/${baseBranch}`]);

      // Merge each task branch into the merge branch
      for (const branch of tierTaskBranches) {
        try {
          this.gitExec(["merge", `origin/${branch}`, "--no-edit"]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(
            c.error(
              `   Merge conflict merging ${branch} into ${mergeBranchName}: ${msg}`
            )
          );
          try {
            this.gitExec(["merge", "--abort"]);
          } catch {
            // Best effort abort
          }
        }
      }

      // Push the merge branch to remote
      this.gitExec(["push", "-u", "origin", mergeBranchName, "--force"]);

      // Switch back to the original branch
      this.gitExec(["checkout", baseBranch]);

      return mergeBranchName;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(c.error(`Failed to create tier merge branch: ${msg}`));
      // Try to recover by switching back to base branch
      try {
        this.gitExec(["checkout", baseBranch]);
      } catch {
        // Best effort recovery
      }
      return null;
    }
  }

  /**
   * Find remote branches that belong to a specific tier's tasks.
   * Matches against registered task IDs by checking branch names.
   */
  private findTierTaskBranches(tier: number): string[] {
    try {
      const output = execSync(
        'git branch -r --list "origin/agent/*" --format="%(refname:short)"',
        { cwd: this.projectPath, encoding: "utf-8" }
      ).trim();

      if (!output) return [];

      const remoteBranches = output
        .split("\n")
        .map((b) => b.replace("origin/", ""));

      return remoteBranches.filter((branch) => {
        // Branch format: agent/<taskId>-<slug>
        const match = branch.match(/^agent\/([^-]+)/);
        if (!match) return false;

        const taskIdPrefix = match[1];
        return (
          this.tierTaskIds
            .get(tier)
            ?.some(
              (id) =>
                id.startsWith(taskIdPrefix) ||
                taskIdPrefix.startsWith(id.slice(0, 8))
            ) ?? false
        );
      });
    } catch {
      return [];
    }
  }

  private gitExec(args: string[]): string {
    return execFileSync("git", args, {
      cwd: this.projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}
