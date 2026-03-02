/**
 * Git submodule utilities — detect, commit, and sync submodules.
 *
 * Handles repos that contain git submodules so that:
 * - Changes inside submodules are committed in the submodule first, then the
 *   parent ref is updated.
 * - Worktrees initialize submodules after creation.
 * - Rebase updates submodule refs after success.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getLogger } from "./logger.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubmoduleInfo {
  /** Relative path from repo root (e.g. "libs/core"). */
  path: string;
  /** Full absolute path on disk. */
  absolutePath: string;
  /** Whether the submodule has uncommitted changes. */
  dirty: boolean;
}

// ─── Git Helpers ─────────────────────────────────────────────────────────────

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

// ─── Detection ───────────────────────────────────────────────────────────────

/**
 * Check whether the repo at `cwd` uses git submodules.
 */
export function hasSubmodules(cwd: string): boolean {
  return existsSync(join(cwd, ".gitmodules"));
}

/**
 * List all registered submodules with their status.
 */
export function listSubmodules(cwd: string): SubmoduleInfo[] {
  if (!hasSubmodules(cwd)) return [];

  const log = getLogger();
  const submodules: SubmoduleInfo[] = [];

  try {
    // `git submodule status` outputs lines like:
    //  <hash> <path> (<desc>)    — clean
    // +<hash> <path> (<desc>)    — dirty (has new commits)
    // -<hash> <path>             — not initialized
    const output = git("submodule status", cwd);

    for (const line of output.trim().split("\n")) {
      if (!line.trim()) continue;

      const dirty = line.startsWith("+");
      // Strip the leading status char and hash
      const parts = line.trim().replace(/^[+-]/, "").split(/\s+/);
      const path = parts[1];
      if (!path) continue;

      submodules.push({
        path,
        absolutePath: join(cwd, path),
        dirty,
      });
    }
  } catch (e) {
    log.warn(`Failed to list submodules: ${e}`);
  }

  return submodules;
}

/**
 * Get submodules that have uncommitted changes (staged or unstaged).
 */
export function getDirtySubmodules(cwd: string): SubmoduleInfo[] {
  const submodules = listSubmodules(cwd);
  const dirty: SubmoduleInfo[] = [];

  for (const sub of submodules) {
    if (!existsSync(sub.absolutePath)) continue;

    const status = gitSafe("status --porcelain", sub.absolutePath);
    if (status && status.trim().length > 0) {
      dirty.push({ ...sub, dirty: true });
    }
  }

  return dirty;
}

// ─── Commit ──────────────────────────────────────────────────────────────────

/**
 * Commit uncommitted changes inside dirty submodules, then stage the updated
 * submodule refs in the parent repo.
 *
 * Returns the list of submodule paths that were committed.
 */
export function commitDirtySubmodules(
  cwd: string,
  issueNumber: number,
  issueTitle: string
): string[] {
  const log = getLogger();
  const dirtySubmodules = getDirtySubmodules(cwd);
  if (dirtySubmodules.length === 0) return [];

  const committed: string[] = [];

  for (const sub of dirtySubmodules) {
    try {
      // Stage all changes inside the submodule
      git("add -A", sub.absolutePath);

      // Commit inside the submodule
      const message = `chore: complete #${issueNumber} - ${issueTitle}\n\nCo-Authored-By: LocusAgent <agent@locusai.team>`;
      execSync("git commit -F -", {
        input: message,
        cwd: sub.absolutePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      committed.push(sub.path);
      log.info(`Committed submodule changes: ${sub.path} for #${issueNumber}`);
    } catch {
      // May fail if submodule has no changes after staging — non-fatal
      log.verbose(`No committable changes in submodule ${sub.path}`);
    }
  }

  // Stage the updated submodule refs in the parent
  if (committed.length > 0) {
    for (const subPath of committed) {
      gitSafe(`add ${subPath}`, cwd);
    }
  }

  return committed;
}

// ─── Worktree & Rebase ───────────────────────────────────────────────────────

/**
 * Initialize and update submodules in a worktree or freshly cloned directory.
 */
export function initSubmodules(cwd: string): void {
  if (!hasSubmodules(cwd)) return;

  const log = getLogger();
  try {
    git("submodule update --init --recursive", cwd);
    log.info("Initialized submodules");
  } catch (e) {
    log.warn(`Failed to initialize submodules: ${e}`);
  }
}

/**
 * Update submodule refs after a rebase to keep them in sync.
 */
export function updateSubmodulesAfterRebase(cwd: string): void {
  if (!hasSubmodules(cwd)) return;

  const log = getLogger();
  try {
    git("submodule update --recursive", cwd);
    log.info("Updated submodules after rebase");
  } catch (e) {
    log.warn(`Failed to update submodules after rebase: ${e}`);
  }
}

// ─── PR Helpers ──────────────────────────────────────────────────────────────

/**
 * Get a summary of submodule changes for PR descriptions.
 * Returns null if no submodules were changed.
 */
export function getSubmoduleChangeSummary(
  cwd: string,
  baseBranch: string
): string | null {
  if (!hasSubmodules(cwd)) return null;

  const diff = gitSafe(
    `diff origin/${baseBranch}..HEAD --submodule=short`,
    cwd
  );
  if (!diff || !diff.trim()) return null;

  // Extract submodule change lines
  const submoduleChanges: string[] = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("Submodule ")) {
      submoduleChanges.push(line.trim());
    }
  }

  if (submoduleChanges.length === 0) return null;

  return `### Submodule Changes\n${submoduleChanges.map((c) => `- ${c}`).join("\n")}`;
}

/**
 * Push submodule branches to their remotes before creating a PR.
 * This ensures the parent repo's submodule refs point to pushed commits.
 */
export function pushSubmoduleBranches(cwd: string): void {
  if (!hasSubmodules(cwd)) return;

  const log = getLogger();
  const submodules = listSubmodules(cwd);

  for (const sub of submodules) {
    if (!existsSync(sub.absolutePath)) continue;

    // Check if the submodule has unpushed commits
    const branch = gitSafe(
      "rev-parse --abbrev-ref HEAD",
      sub.absolutePath
    )?.trim();
    if (!branch || branch === "HEAD") continue; // Detached HEAD — skip

    const unpushed = gitSafe(
      `log origin/${branch}..HEAD --oneline`,
      sub.absolutePath
    )?.trim();

    if (unpushed) {
      try {
        git(`push origin ${branch}`, sub.absolutePath);
        log.info(`Pushed submodule ${sub.path} branch ${branch}`);
      } catch (e) {
        log.warn(`Failed to push submodule ${sub.path}: ${e}`);
      }
    }
  }
}
