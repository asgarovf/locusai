import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cleanupStaleWorktrees,
  createWorktree,
  getWorktreePath,
  getWorktreeAge,
  hasWorktreeChanges,
  listWorktrees,
  removeWorktree,
} from "../src/core/worktree.js";

const TEST_DIR = join(tmpdir(), `locus-test-worktree-${Date.now()}`);

function git(args: string): string {
  return execSync(`git ${args}`, {
    cwd: TEST_DIR,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

beforeEach(() => {
  // Create a fresh git repo with an initial commit
  mkdirSync(TEST_DIR, { recursive: true });
  git("init -b main");
  git("config user.email test@test.com");
  git("config user.name Test");
  writeFileSync(join(TEST_DIR, "README.md"), "# Test\n");
  git("add .");
  git('commit -m "initial commit"');

  // Create .locus directory
  mkdirSync(join(TEST_DIR, ".locus", "worktrees"), { recursive: true });
});

afterEach(() => {
  // Clean up worktrees before removing the directory
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: TEST_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    // Remove any extra worktrees
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ") && !line.includes(TEST_DIR + "\n")) {
        const path = line.replace("worktree ", "").trim();
        if (path !== TEST_DIR) {
          try {
            execSync(`git worktree remove "${path}" --force`, {
              cwd: TEST_DIR,
              encoding: "utf-8",
              stdio: ["pipe", "pipe", "pipe"],
            });
          } catch {
            // Best effort
          }
        }
      }
    }
  } catch {
    // Best effort
  }

  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ─── Path Helpers ────────────────────────────────────────────────────────────

describe("getWorktreePath", () => {
  it("returns correct path for an issue", () => {
    const path = getWorktreePath(TEST_DIR, 42);
    expect(path).toBe(join(TEST_DIR, ".locus", "worktrees", "issue-42"));
  });

  it("returns different paths for different issues", () => {
    const path1 = getWorktreePath(TEST_DIR, 42);
    const path2 = getWorktreePath(TEST_DIR, 43);
    expect(path1).not.toBe(path2);
  });
});

// ─── Create / Remove ────────────────────────────────────────────────────────

describe("createWorktree", () => {
  it("creates a worktree directory and branch", () => {
    const result = createWorktree(TEST_DIR, 42, "main");

    expect(result.issueNumber).toBe(42);
    expect(result.branch).toBe("locus/issue-42");
    expect(result.status).toBe("active");
    expect(existsSync(result.path)).toBe(true);

    // Verify git knows about it
    const worktreeList = git("worktree list --porcelain");
    expect(worktreeList).toContain("issue-42");
  });

  it("returns existing worktree if already created", () => {
    const first = createWorktree(TEST_DIR, 42, "main");
    const second = createWorktree(TEST_DIR, 42, "main");

    expect(second.path).toBe(first.path);
    expect(second.branch).toBe(first.branch);
  });

  it("creates worktree based on the specified branch", () => {
    const wt = createWorktree(TEST_DIR, 10, "main");

    // The worktree should have the same initial commit as main
    const mainHash = git("rev-parse main").trim();
    const wtHash = execSync("git rev-parse HEAD", {
      cwd: wt.path,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    expect(wtHash).toBe(mainHash);
  });
});

describe("removeWorktree", () => {
  it("removes an existing worktree", () => {
    const wt = createWorktree(TEST_DIR, 42, "main");
    expect(existsSync(wt.path)).toBe(true);

    removeWorktree(TEST_DIR, 42);
    expect(existsSync(wt.path)).toBe(false);
  });

  it("handles removing a non-existent worktree gracefully", () => {
    // Should not throw
    removeWorktree(TEST_DIR, 999);
  });
});

// ─── List ────────────────────────────────────────────────────────────────────

describe("listWorktrees", () => {
  it("returns empty array when no worktrees exist", () => {
    const result = listWorktrees(TEST_DIR);
    expect(result).toEqual([]);
  });

  it("lists created worktrees", () => {
    createWorktree(TEST_DIR, 42, "main");
    createWorktree(TEST_DIR, 43, "main");

    const result = listWorktrees(TEST_DIR);
    expect(result.length).toBe(2);

    const numbers = result.map((w) => w.issueNumber).sort();
    expect(numbers).toEqual([42, 43]);
  });

  it("marks active worktrees correctly", () => {
    createWorktree(TEST_DIR, 42, "main");

    const result = listWorktrees(TEST_DIR);
    expect(result.length).toBe(1);
    expect(result[0].status).toBe("active");
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

describe("cleanupStaleWorktrees", () => {
  it("returns 0 when no stale worktrees exist", () => {
    createWorktree(TEST_DIR, 42, "main");
    const cleaned = cleanupStaleWorktrees(TEST_DIR);
    expect(cleaned).toBe(0);
  });

  it("returns 0 when no worktrees exist at all", () => {
    const cleaned = cleanupStaleWorktrees(TEST_DIR);
    expect(cleaned).toBe(0);
  });
});

// ─── Utility Functions ───────────────────────────────────────────────────────

describe("hasWorktreeChanges", () => {
  it("returns false when no worktree exists", () => {
    expect(hasWorktreeChanges(TEST_DIR, 999)).toBe(false);
  });

  it("returns false for clean worktree", () => {
    createWorktree(TEST_DIR, 42, "main");
    expect(hasWorktreeChanges(TEST_DIR, 42)).toBe(false);
  });

  it("returns true when worktree has uncommitted changes", () => {
    const wt = createWorktree(TEST_DIR, 42, "main");
    writeFileSync(join(wt.path, "new-file.txt"), "changes\n");
    expect(hasWorktreeChanges(TEST_DIR, 42)).toBe(true);
  });
});

describe("getWorktreeAge", () => {
  it("returns 0 for non-existent worktree", () => {
    expect(getWorktreeAge(TEST_DIR, 999)).toBe(0);
  });

  it("returns positive age for existing worktree", () => {
    createWorktree(TEST_DIR, 42, "main");
    const age = getWorktreeAge(TEST_DIR, 42);
    expect(age).toBeGreaterThanOrEqual(0);
    // Should be less than 5 seconds old
    expect(age).toBeLessThan(5000);
  });
});
