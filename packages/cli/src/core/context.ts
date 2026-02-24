/**
 * Repository context detection — owner/repo from git remote, branch info.
 */

import { execSync } from "node:child_process";
import { getLogger } from "./logger.js";

export interface RepoContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  currentBranch: string;
  remoteUrl: string;
}

/** Detect repository context from git remote and GitHub CLI. */
export function detectRepoContext(cwd: string): RepoContext {
  const log = getLogger();

  // Get remote URL
  const remoteUrl = git("config --get remote.origin.url", cwd).trim();
  if (!remoteUrl) {
    throw new Error(
      "No git remote 'origin' found. Add a GitHub remote: git remote add origin <url>"
    );
  }

  log.verbose("Detected remote URL", { remoteUrl });

  // Parse owner/repo from remote URL
  const { owner, repo } = parseRemoteUrl(remoteUrl);
  if (!owner || !repo) {
    throw new Error(`Could not parse owner/repo from remote URL: ${remoteUrl}`);
  }

  // Get current branch
  const currentBranch = git("rev-parse --abbrev-ref HEAD", cwd).trim();

  // Get default branch from GitHub
  let defaultBranch = "main";
  try {
    const ghOutput = execSync(
      "gh repo view --json defaultBranchRef --jq .defaultBranchRef.name",
      { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (ghOutput) {
      defaultBranch = ghOutput;
    }
  } catch {
    // Fallback: try to detect from remote HEAD
    try {
      const remoteHead = git("symbolic-ref refs/remotes/origin/HEAD", cwd)
        .trim()
        .replace("refs/remotes/origin/", "");
      if (remoteHead) {
        defaultBranch = remoteHead;
      }
    } catch {
      log.verbose("Could not detect default branch, using 'main'");
    }
  }

  log.verbose("Repository context", {
    owner,
    repo,
    defaultBranch,
    currentBranch,
  });

  return { owner, repo, defaultBranch, currentBranch, remoteUrl };
}

/** Parse owner and repo from various Git remote URL formats. */
export function parseRemoteUrl(url: string): { owner: string; repo: string } {
  // SSH: git@github.com:owner/repo.git
  let match = url.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (match) return { owner: match[1], repo: match[2] };

  // HTTPS: https://github.com/owner/repo.git
  match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (match) return { owner: match[1], repo: match[2] };

  // gh:owner/repo (GitHub CLI shorthand)
  match = url.match(/^([^/]+)\/([^/.]+)$/);
  if (match) return { owner: match[1], repo: match[2] };

  return { owner: "", repo: "" };
}

/** Check if the current directory is inside a git repository. */
export function isGitRepo(cwd: string): boolean {
  try {
    git("rev-parse --git-dir", cwd);
    return true;
  } catch {
    return false;
  }
}

/** Check if `gh` CLI is installed and authenticated. */
export function checkGhCli(): { installed: boolean; authenticated: boolean } {
  try {
    execSync("gh --version", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return { installed: false, authenticated: false };
  }

  try {
    execSync("gh auth status", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { installed: true, authenticated: true };
  } catch {
    return { installed: true, authenticated: false };
  }
}

/** Get the root of the git repository. */
export function getGitRoot(cwd: string): string {
  return git("rev-parse --show-toplevel", cwd).trim();
}

// ─── Internal ────────────────────────────────────────────────────────────────

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}
