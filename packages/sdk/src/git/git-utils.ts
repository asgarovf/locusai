import { execFileSync } from "node:child_process";

export type RemoteProvider = "github" | "gitlab" | "bitbucket" | "unknown";

/**
 * Check if `git` is installed and available.
 */
export function isGitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the GitHub CLI (`gh`) is installed and authenticated.
 */
export function isGhAvailable(projectPath?: string): boolean {
  try {
    execFileSync("gh", ["auth", "status"], {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the authenticated GitHub username via `gh`.
 * Returns null if gh is not available or not authenticated.
 */
export function getGhUsername(): string | null {
  try {
    const output = execFileSync("gh", ["api", "user", "--jq", ".login"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return output || null;
  } catch {
    return null;
  }
}

/**
 * Detect the git remote provider from the origin URL.
 */
export function detectRemoteProvider(projectPath: string): RemoteProvider {
  const url = getRemoteUrl(projectPath);
  if (!url) return "unknown";

  if (url.includes("github.com")) return "github";
  if (url.includes("gitlab.com") || url.includes("gitlab")) return "gitlab";
  if (url.includes("bitbucket.org")) return "bitbucket";

  return "unknown";
}

/**
 * Get the remote origin URL.
 */
export function getRemoteUrl(
  projectPath: string,
  remote = "origin"
): string | null {
  try {
    return execFileSync("git", ["remote", "get-url", remote], {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Get the current branch name.
 */
export function getCurrentBranch(projectPath: string): string {
  return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: projectPath,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

/**
 * Get the default branch of the remote (e.g. main, master).
 */
export function getDefaultBranch(
  projectPath: string,
  remote = "origin"
): string {
  try {
    const ref = execFileSync(
      "git",
      ["symbolic-ref", `refs/remotes/${remote}/HEAD`],
      {
        cwd: projectPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();
    // refs/remotes/origin/main -> main
    return ref.replace(`refs/remotes/${remote}/`, "");
  } catch {
    for (const candidate of ["main", "master"]) {
      try {
        execFileSync(
          "git",
          ["ls-remote", "--exit-code", "--heads", remote, candidate],
          {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        );
        return candidate;
      } catch {
        // Try next candidate.
      }
    }

    // Final fallback: use current checked-out branch.
    try {
      return getCurrentBranch(projectPath);
    } catch {
      return "main";
    }
  }
}
