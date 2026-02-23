/**
 * Whitelist-based command validation for Telegram bot.
 * Only explicitly allowed command patterns can be executed.
 * Prevents shell injection by validating inputs before spawn().
 */

import { parseArgs } from "./input-parser.js";

// Re-export for backward compatibility
export { normalizeInput, parseArgs } from "./input-parser.js";

/** Safe branch name pattern — alphanumeric, hyphens, underscores, slashes, dots */
const SAFE_BRANCH = /^[a-zA-Z0-9_\-./]+$/;

/** Safe file path pattern — no shell metacharacters */
const SAFE_PATH = /^[a-zA-Z0-9_\-./\s]+$/;

/** Max commit message length */
const MAX_COMMIT_MSG_LENGTH = 500;

/** Max log count for git log */
const MAX_LOG_COUNT = 50;

/** Dangerous flags that are never allowed */
const DENY_PATTERNS = [
  "--force",
  "-f",
  "--hard",
  "--delete",
  "-D",
  "--no-verify",
  "--force-with-lease",
  "reset",
];

export interface ValidatedCommand {
  binary: string;
  args: string[];
}

export interface ValidationResult {
  ok: boolean;
  command?: ValidatedCommand;
  error?: string;
}

function isDenied(args: string[]): string | null {
  for (const arg of args) {
    for (const pattern of DENY_PATTERNS) {
      if (arg === pattern) {
        return `Blocked: "${pattern}" is not allowed`;
      }
    }
  }
  return null;
}

function validateBranch(name: string): boolean {
  return SAFE_BRANCH.test(name) && name.length <= 100;
}

function validatePath(p: string): boolean {
  return (
    SAFE_PATH.test(p) &&
    !p.includes("..") &&
    !p.startsWith("/") &&
    p.length <= 200
  );
}

/**
 * Parse user input after `/git` into a validated command.
 * Returns { ok, command } on success, { ok: false, error } on failure.
 */
export function validateGitCommand(input: string): ValidationResult {
  const parts = parseArgs(input);
  if (parts.length === 0) {
    return { ok: false, error: "No git subcommand provided" };
  }

  // Check if this is a `gh` command
  if (parts[0] === "gh") {
    return validateGhCommand(parts.slice(1));
  }

  // Strip leading "git" if user typed `/git git status`
  const args = parts[0] === "git" ? parts.slice(1) : parts;
  if (args.length === 0) {
    return { ok: false, error: "No git subcommand provided" };
  }

  const denied = isDenied(args);
  if (denied) {
    return { ok: false, error: denied };
  }

  const sub = args[0];

  // --- Read-only commands ---
  if (sub === "status" && args.length === 1) {
    return { ok: true, command: { binary: "git", args: ["status"] } };
  }

  if (sub === "log") {
    return validateGitLog(args);
  }

  if (sub === "diff") {
    return validateGitDiff(args);
  }

  // --- Branch commands ---
  if (sub === "branch") {
    return validateGitBranch(args);
  }

  if (sub === "checkout" || sub === "switch") {
    return validateGitCheckout(sub, args);
  }

  // --- Staging ---
  if (sub === "add") {
    return validateGitAdd(args);
  }

  // --- Commit ---
  if (sub === "commit") {
    return validateGitCommit(args);
  }

  // --- Push/Pull ---
  if (sub === "push") {
    return validateGitPush(args);
  }

  if (sub === "pull") {
    return validateGitPull(args);
  }

  // --- Stash ---
  if (sub === "stash") {
    return validateGitStash(args);
  }

  return {
    ok: false,
    error: `Unknown or unsupported git subcommand: "${sub}"`,
  };
}

function validateGitLog(args: string[]): ValidationResult {
  // git log --oneline -N
  const gitArgs = ["log", "--oneline"];
  let count = 10; // default

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--oneline") continue;
    if (arg.startsWith("-") && !Number.isNaN(Number(arg.slice(1)))) {
      count = Number(arg.slice(1));
    } else {
      return { ok: false, error: `Unsupported git log argument: "${arg}"` };
    }
  }

  if (count < 1 || count > MAX_LOG_COUNT) {
    return { ok: false, error: `Log count must be 1-${MAX_LOG_COUNT}` };
  }

  gitArgs.push(`-${count}`);
  return { ok: true, command: { binary: "git", args: gitArgs } };
}

function validateGitDiff(args: string[]): ValidationResult {
  if (args.length === 1) {
    return { ok: true, command: { binary: "git", args: ["diff"] } };
  }
  if (args.length === 2 && args[1] === "--staged") {
    return { ok: true, command: { binary: "git", args: ["diff", "--staged"] } };
  }
  return { ok: false, error: "Usage: git diff [--staged]" };
}

function validateGitBranch(args: string[]): ValidationResult {
  if (args.length === 1) {
    return { ok: true, command: { binary: "git", args: ["branch"] } };
  }
  if (args.length === 2) {
    const name = args[1];
    if (!validateBranch(name)) {
      return { ok: false, error: `Invalid branch name: "${name}"` };
    }
    return { ok: true, command: { binary: "git", args: ["branch", name] } };
  }
  return { ok: false, error: "Usage: git branch [name]" };
}

function validateGitCheckout(sub: string, args: string[]): ValidationResult {
  // checkout <branch> | checkout -b <branch> | switch <branch> | switch -c <branch>
  const createFlag = sub === "checkout" ? "-b" : "-c";

  if (args.length === 2) {
    const branch = args[1];
    if (!validateBranch(branch)) {
      return { ok: false, error: `Invalid branch name: "${branch}"` };
    }
    return { ok: true, command: { binary: "git", args: [sub, branch] } };
  }

  if (args.length === 3 && args[1] === createFlag) {
    const branch = args[2];
    if (!validateBranch(branch)) {
      return { ok: false, error: `Invalid branch name: "${branch}"` };
    }
    return {
      ok: true,
      command: { binary: "git", args: [sub, createFlag, branch] },
    };
  }

  return {
    ok: false,
    error: `Usage: git ${sub} <branch> | git ${sub} ${createFlag} <branch>`,
  };
}

function validateGitAdd(args: string[]): ValidationResult {
  if (args.length < 2) {
    return { ok: false, error: "Usage: git add <files...>" };
  }

  const files = args.slice(1);
  for (const f of files) {
    if (f === ".") continue;
    if (!validatePath(f)) {
      return { ok: false, error: `Invalid file path: "${f}"` };
    }
  }

  return { ok: true, command: { binary: "git", args: ["add", ...files] } };
}

function validateGitCommit(args: string[]): ValidationResult {
  // git commit -m "message"
  const mIndex = args.indexOf("-m");
  if (mIndex === -1 || mIndex + 1 >= args.length) {
    return { ok: false, error: 'Usage: git commit -m "message"' };
  }

  const message = args.slice(mIndex + 1).join(" ");
  if (!message || message.length > MAX_COMMIT_MSG_LENGTH) {
    return {
      ok: false,
      error: `Commit message must be 1-${MAX_COMMIT_MSG_LENGTH} characters`,
    };
  }

  return {
    ok: true,
    command: { binary: "git", args: ["commit", "-m", message] },
  };
}

function validateGitPush(args: string[]): ValidationResult {
  if (args.length === 1) {
    return { ok: true, command: { binary: "git", args: ["push"] } };
  }

  // git push -u origin <branch>
  if (
    args.length === 4 &&
    args[1] === "-u" &&
    args[2] === "origin" &&
    validateBranch(args[3])
  ) {
    return {
      ok: true,
      command: { binary: "git", args: ["push", "-u", "origin", args[3]] },
    };
  }

  // git push origin <branch>
  if (args.length === 3 && args[1] === "origin" && validateBranch(args[2])) {
    return {
      ok: true,
      command: { binary: "git", args: ["push", "origin", args[2]] },
    };
  }

  return {
    ok: false,
    error:
      "Usage: git push | git push -u origin <branch> | git push origin <branch>",
  };
}

function validateGitPull(args: string[]): ValidationResult {
  if (args.length === 1) {
    return { ok: true, command: { binary: "git", args: ["pull"] } };
  }

  // git pull origin <branch>
  if (args.length === 3 && args[1] === "origin" && validateBranch(args[2])) {
    return {
      ok: true,
      command: { binary: "git", args: ["pull", "origin", args[2]] },
    };
  }

  return {
    ok: false,
    error: "Usage: git pull | git pull origin <branch>",
  };
}

function validateGitStash(args: string[]): ValidationResult {
  if (args.length === 1) {
    return { ok: true, command: { binary: "git", args: ["stash"] } };
  }

  const sub = args[1];
  if (sub === "pop" && args.length === 2) {
    return { ok: true, command: { binary: "git", args: ["stash", "pop"] } };
  }
  if (sub === "list" && args.length === 2) {
    return { ok: true, command: { binary: "git", args: ["stash", "list"] } };
  }

  return {
    ok: false,
    error: "Usage: git stash | git stash pop | git stash list",
  };
}

// --- GitHub CLI (gh) commands ---

function validateGhCommand(args: string[]): ValidationResult {
  if (args.length < 2) {
    return { ok: false, error: "Usage: gh pr <subcommand>" };
  }

  if (args[0] !== "pr") {
    return { ok: false, error: "Only `gh pr` commands are supported" };
  }

  const sub = args[1];

  if (sub === "list" && args.length === 2) {
    return { ok: true, command: { binary: "gh", args: ["pr", "list"] } };
  }

  if (sub === "view") {
    if (args.length === 2) {
      return { ok: true, command: { binary: "gh", args: ["pr", "view"] } };
    }
    if (args.length === 3 && /^\d+$/.test(args[2])) {
      return {
        ok: true,
        command: { binary: "gh", args: ["pr", "view", args[2]] },
      };
    }
    return { ok: false, error: "Usage: gh pr view [number]" };
  }

  if (sub === "create") {
    return validateGhPrCreate(args.slice(2));
  }

  return { ok: false, error: `Unsupported gh pr subcommand: "${sub}"` };
}

function validateGhPrCreate(args: string[]): ValidationResult {
  // Positional: gh pr create <title> [body]
  // With 1 arg: entire arg is the title
  // With 2 args: first is title, second is body (use quotes for multi-word)
  // With 3+ args: all args joined as title (no body)
  if (args.length === 0) {
    return {
      ok: false,
      error: 'Usage: /git gh pr create "title" "body (optional)"',
    };
  }

  let title: string;
  let body: string | null = null;

  if (args.length === 2) {
    // Two args: title + body (quote multi-word values)
    title = args[0];
    body = args[1];
  } else {
    // One arg or 3+: join everything as the title
    title = args.join(" ");
  }

  if (title.length > 200) {
    return { ok: false, error: "PR title must be under 200 characters" };
  }

  const ghArgs = ["pr", "create", "--title", title];

  if (body) {
    if (body.length > 2000) {
      return { ok: false, error: "PR body must be under 2000 characters" };
    }
    ghArgs.push("--body", body);
  } else {
    // Pass empty body to prevent gh from entering interactive mode
    ghArgs.push("--body", "");
  }

  return { ok: true, command: { binary: "gh", args: ghArgs } };
}

// --- Dev command validation ---

export type DevSubcommand = "lint" | "typecheck" | "build" | "test";

const DEV_COMMANDS: Record<DevSubcommand, ValidatedCommand> = {
  lint: { binary: "bun", args: ["run", "biome", "lint", "."] },
  typecheck: { binary: "bun", args: ["run", "typecheck"] },
  build: { binary: "bun", args: ["run", "build"] },
  test: { binary: "bun", args: ["run", "test"] },
};

export function validateDevCommand(input: string): ValidationResult {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return { ok: false, error: "No dev subcommand provided" };
  }

  const command = DEV_COMMANDS[trimmed as DevSubcommand];
  if (!command) {
    return {
      ok: false,
      error: `Unknown dev command: "${trimmed}". Available: ${Object.keys(DEV_COMMANDS).join(", ")}`,
    };
  }

  return { ok: true, command };
}
