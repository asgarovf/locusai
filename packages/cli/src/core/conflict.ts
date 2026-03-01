/**
 * Merge conflict detection and resolution.
 * Checks for base branch drift, attempts automatic rebase,
 * and reports conflicting files when rebase fails.
 */

import { execSync } from "node:child_process";
import { bold, cyan, dim, red, yellow } from "../display/terminal.js";
import type { ConflictCheckResult } from "../types.js";
import { getLogger } from "./logger.js";
import { updateSubmodulesAfterRebase } from "./submodule.js";

// ─── Git Helpers ──────────────────────────────────────────────────────────────

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function gitSafe(args: string, cwd: string): string | null {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

// ─── Conflict Detection ──────────────────────────────────────────────────────

/**
 * Check if the base branch has advanced since the sprint branch was created.
 * Returns conflict information including whether rebase is needed.
 */
export function checkForConflicts(
  cwd: string,
  baseBranch: string
): ConflictCheckResult {
  const log = getLogger();

  // Fetch latest from remote (non-fatal if it fails)
  try {
    git(`fetch origin ${baseBranch}`, cwd);
    log.debug("Fetched latest from origin", { baseBranch });
  } catch (e) {
    log.warn(`Could not fetch origin/${baseBranch}: ${e}`);
    return {
      hasConflict: false,
      conflictingFiles: [],
      baseAdvanced: false,
      newCommits: 0,
    };
  }

  // Check how many new commits are on origin/baseBranch since our branch point
  const currentBranch =
    gitSafe("rev-parse --abbrev-ref HEAD", cwd)?.trim() ?? "";
  const mergeBase = gitSafe(
    `merge-base ${currentBranch} origin/${baseBranch}`,
    cwd
  )?.trim();

  if (!mergeBase) {
    log.debug("Could not find merge base — branches may be unrelated");
    return {
      hasConflict: false,
      conflictingFiles: [],
      baseAdvanced: false,
      newCommits: 0,
    };
  }

  const remoteTip = gitSafe(`rev-parse origin/${baseBranch}`, cwd)?.trim();
  if (!remoteTip || remoteTip === mergeBase) {
    log.debug("Base branch has not advanced");
    return {
      hasConflict: false,
      conflictingFiles: [],
      baseAdvanced: false,
      newCommits: 0,
    };
  }

  // Count new commits on base since our merge base
  const newCommitsOutput =
    gitSafe(
      `rev-list --count ${mergeBase}..origin/${baseBranch}`,
      cwd
    )?.trim() ?? "0";
  const newCommits = Number.parseInt(newCommitsOutput, 10);

  log.verbose(`Base branch has ${newCommits} new commits`, {
    baseBranch,
    mergeBase: mergeBase.slice(0, 8),
    remoteTip: remoteTip.slice(0, 8),
  });

  // Check for file-level conflicts without actually rebasing
  // git diff --name-only between our changes and base changes
  const ourChanges =
    gitSafe(`diff --name-only ${mergeBase}..HEAD`, cwd)
      ?.trim()
      .split("\n")
      .filter(Boolean) ?? [];
  const theirChanges =
    gitSafe(`diff --name-only ${mergeBase}..origin/${baseBranch}`, cwd)
      ?.trim()
      .split("\n")
      .filter(Boolean) ?? [];

  const overlapping = ourChanges.filter((f) => theirChanges.includes(f));

  return {
    hasConflict: overlapping.length > 0,
    conflictingFiles: overlapping,
    baseAdvanced: true,
    newCommits,
  };
}

/**
 * Attempt to rebase the current branch onto the latest base branch.
 * Returns success status and any conflicting files if rebase failed.
 */
export function attemptRebase(
  cwd: string,
  baseBranch: string
): { success: boolean; conflicts?: string[] } {
  const log = getLogger();

  try {
    git(`rebase origin/${baseBranch}`, cwd);
    log.info(`Successfully rebased onto origin/${baseBranch}`);

    // Update submodule refs after successful rebase
    updateSubmodulesAfterRebase(cwd);

    return { success: true };
  } catch (_e) {
    // Rebase failed — extract conflicting files
    log.warn("Rebase failed, aborting");

    const conflicts: string[] = [];
    try {
      const status = git("diff --name-only --diff-filter=U", cwd);
      conflicts.push(...status.trim().split("\n").filter(Boolean));
    } catch {
      // Best effort
    }

    // Abort the failed rebase
    gitSafe("rebase --abort", cwd);

    return { success: false, conflicts };
  }
}

/**
 * Print conflict information to stderr with recovery instructions.
 */
export function printConflictReport(
  result: ConflictCheckResult,
  baseBranch: string
): void {
  if (!result.baseAdvanced) return;

  if (result.hasConflict) {
    process.stderr.write(
      `\n${bold(red("✗"))} ${bold("Merge conflict detected")}\n\n`
    );
    process.stderr.write(
      `  Base branch ${cyan(`origin/${baseBranch}`)} has ${result.newCommits} new commit${result.newCommits === 1 ? "" : "s"}\n`
    );
    process.stderr.write(
      `  The following files were modified in both branches:\n\n`
    );
    for (const file of result.conflictingFiles) {
      process.stderr.write(`    ${red("•")} ${file}\n`);
    }
    process.stderr.write(`\n  ${bold("To resolve:")}\n`);
    process.stderr.write(`    1. ${dim(`git rebase origin/${baseBranch}`)}\n`);
    process.stderr.write(`    2. Resolve conflicts in the listed files\n`);
    process.stderr.write(`    3. ${dim("git rebase --continue")}\n`);
    process.stderr.write(
      `    4. ${dim("locus run --resume")} to continue the sprint\n\n`
    );
  } else if (result.newCommits > 0) {
    process.stderr.write(
      `\n${bold(yellow("⚠"))} Base branch has ${result.newCommits} new commit${result.newCommits === 1 ? "" : "s"} — auto-rebasing...\n`
    );
  }
}
