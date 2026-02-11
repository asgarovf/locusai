/**
 * Whitelist-based command validation for Telegram bot.
 * Only explicitly allowed command patterns can be executed.
 * Prevents shell injection by validating inputs before spawn().
 */

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

  if (sub === "pull" && args.length === 1) {
    return { ok: true, command: { binary: "git", args: ["pull"] } };
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
  const ghArgs = ["pr", "create"];
  let title: string | null = null;
  let body: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--title" && i + 1 < args.length) {
      title = args[++i];
    } else if (args[i] === "--body" && i + 1 < args.length) {
      body = args[++i];
    } else {
      return {
        ok: false,
        error: `Unsupported gh pr create argument: "${args[i]}"`,
      };
    }
  }

  if (!title) {
    return {
      ok: false,
      error: 'Usage: gh pr create --title "title" --body "body"',
    };
  }

  if (title.length > 200) {
    return { ok: false, error: "PR title must be under 200 characters" };
  }

  ghArgs.push("--title", title);

  if (body) {
    if (body.length > 2000) {
      return { ok: false, error: "PR body must be under 2000 characters" };
    }
    ghArgs.push("--body", body);
  }

  return { ok: true, command: { binary: "gh", args: ghArgs } };
}

// --- Dev command validation ---

export type DevSubcommand = "lint" | "typecheck" | "build" | "test";

const DEV_COMMANDS: Record<DevSubcommand, ValidatedCommand> = {
  lint: { binary: "bun", args: ["run", "biome", "lint", "."] },
  typecheck: { binary: "bun", args: ["run", "tsc", "--noEmit"] },
  build: { binary: "bun", args: ["run", "build"] },
  test: { binary: "bun", args: ["test"] },
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

// --- Argument parsing ---

/**
 * Parse a command string into arguments, respecting quoted strings.
 * Handles both single and double quotes.
 */
export function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}
