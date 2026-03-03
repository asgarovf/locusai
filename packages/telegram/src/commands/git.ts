/**
 * Git command handlers — stage, commit, stash, branch, checkout, diff, PR.
 *
 * Uses direct git subprocess calls for fast, local operations.
 * PR creation uses `gh` CLI (same as the locus CLI does).
 */

import { execSync } from "node:child_process";
import type { Context } from "grammy";
import {
  bold,
  codeBlock,
  escapeHtml,
  formatError,
  formatSuccess,
} from "../ui/format.js";
import { stashKeyboard } from "../ui/keyboards.js";
import {
  gitBranchCreatedMessage,
  gitCheckoutMessage,
  gitCommitMessage,
  gitStashMessage,
  prCreatedMessage,
} from "../ui/messages.js";

// ─── Git Helper ─────────────────────────────────────────────────────────────

function git(args: string): string {
  return execSync(`git ${args}`, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: process.cwd(),
  });
}

function gitSafe(args: string): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

// ─── Command Handlers ───────────────────────────────────────────────────────

/** /gitstatus — show git status */
export async function handleGitStatus(ctx: Context): Promise<void> {
  try {
    const status = git("status --short");
    if (!status.trim()) {
      await ctx.reply(formatSuccess("Working tree is clean."), {
        parse_mode: "HTML",
      });
      return;
    }

    const branch = git("branch --show-current").trim();
    await ctx.reply(
      `${bold("Branch:")} ${escapeHtml(branch)}\n\n${codeBlock(status)}`,
      { parse_mode: "HTML" }
    );
  } catch (error: unknown) {
    await ctx.reply(formatError("Failed to get git status", String(error)), {
      parse_mode: "HTML",
    });
  }
}

/** /stage [files|.] — stage files for commit */
export async function handleStage(ctx: Context, args: string[]): Promise<void> {
  const target = args.length > 0 ? args.join(" ") : ".";

  try {
    git(`add ${target}`);
    const status = git("status --short");
    await ctx.reply(
      `${formatSuccess(`Staged: ${target}`)}\n\n${codeBlock(status)}`,
      { parse_mode: "HTML" }
    );
  } catch (error: unknown) {
    await ctx.reply(formatError("Failed to stage files", String(error)), {
      parse_mode: "HTML",
    });
  }
}

/** /commit <message> — commit staged changes */
export async function handleCommit(
  ctx: Context,
  args: string[]
): Promise<void> {
  if (args.length === 0) {
    await ctx.reply(formatError("Usage: /commit <message>"), {
      parse_mode: "HTML",
    });
    return;
  }

  const message = args.join(" ");

  try {
    const result = git(`commit -m ${JSON.stringify(message)}`);
    // Extract short hash from commit output
    const hashMatch = result.match(/\[[\w/.-]+ ([a-f0-9]+)\]/);
    const hash = hashMatch?.[1] ?? "unknown";

    await ctx.reply(gitCommitMessage(message, hash), {
      parse_mode: "HTML",
    });
  } catch (error: unknown) {
    const errStr = String(error);
    if (errStr.includes("nothing to commit")) {
      await ctx.reply(
        formatError("Nothing to commit. Stage changes first with /stage"),
        {
          parse_mode: "HTML",
        }
      );
    } else {
      await ctx.reply(formatError("Failed to commit", errStr), {
        parse_mode: "HTML",
      });
    }
  }
}

/** /stash [pop|list|drop|save] — stash operations */
export async function handleStash(ctx: Context, args: string[]): Promise<void> {
  const subcommand = args[0] ?? "push";

  try {
    switch (subcommand) {
      case "push":
      case "save": {
        const message = args.slice(1).join(" ");
        const stashArgs = message
          ? `stash push -m ${JSON.stringify(message)}`
          : "stash push";
        git(stashArgs);
        await ctx.reply(gitStashMessage("Changes stashed"), {
          parse_mode: "HTML",
          reply_markup: stashKeyboard(),
        });
        break;
      }
      case "pop": {
        git("stash pop");
        await ctx.reply(gitStashMessage("Stash popped"), {
          parse_mode: "HTML",
        });
        break;
      }
      case "list": {
        const list = gitSafe("stash list") ?? "";
        if (!list.trim()) {
          await ctx.reply(formatSuccess("No stashes."), {
            parse_mode: "HTML",
          });
        } else {
          await ctx.reply(codeBlock(list), { parse_mode: "HTML" });
        }
        break;
      }
      case "drop": {
        const stashRef = args[1] ?? "stash@{0}";
        git(`stash drop ${stashRef}`);
        await ctx.reply(gitStashMessage(`Dropped ${stashRef}`), {
          parse_mode: "HTML",
        });
        break;
      }
      default: {
        // Default: just stash
        git("stash push");
        await ctx.reply(gitStashMessage("Changes stashed"), {
          parse_mode: "HTML",
          reply_markup: stashKeyboard(),
        });
      }
    }
  } catch (error: unknown) {
    await ctx.reply(formatError("Stash operation failed", String(error)), {
      parse_mode: "HTML",
    });
  }
}

/** /branch [name] — list branches or create a new one */
export async function handleBranch(
  ctx: Context,
  args: string[]
): Promise<void> {
  try {
    if (args.length === 0) {
      // List branches
      const branches = git("branch -a --format='%(refname:short)'");
      const current = git("branch --show-current").trim();
      await ctx.reply(
        `${bold("Current:")} ${escapeHtml(current)}\n\n${codeBlock(branches)}`,
        { parse_mode: "HTML" }
      );
    } else {
      // Create new branch
      const branchName = args[0];
      git(`branch ${branchName}`);
      await ctx.reply(gitBranchCreatedMessage(branchName), {
        parse_mode: "HTML",
      });
    }
  } catch (error: unknown) {
    await ctx.reply(formatError("Branch operation failed", String(error)), {
      parse_mode: "HTML",
    });
  }
}

/** /checkout <branch> — switch to a branch */
export async function handleCheckout(
  ctx: Context,
  args: string[]
): Promise<void> {
  if (args.length === 0) {
    await ctx.reply(formatError("Usage: /checkout <branch>"), {
      parse_mode: "HTML",
    });
    return;
  }

  const branch = args[0];

  try {
    git(`checkout ${branch}`);
    await ctx.reply(gitCheckoutMessage(branch), { parse_mode: "HTML" });
  } catch (error: unknown) {
    await ctx.reply(formatError("Checkout failed", String(error)), {
      parse_mode: "HTML",
    });
  }
}

/** /diff — show git diff summary */
export async function handleDiff(ctx: Context): Promise<void> {
  try {
    const diff = git("diff --stat");
    if (!diff.trim()) {
      const staged = git("diff --cached --stat");
      if (!staged.trim()) {
        await ctx.reply(formatSuccess("No changes."), {
          parse_mode: "HTML",
        });
      } else {
        await ctx.reply(`${bold("Staged changes:")}\n\n${codeBlock(staged)}`, {
          parse_mode: "HTML",
        });
      }
    } else {
      await ctx.reply(`${bold("Unstaged changes:")}\n\n${codeBlock(diff)}`, {
        parse_mode: "HTML",
      });
    }
  } catch (error: unknown) {
    await ctx.reply(formatError("Diff failed", String(error)), {
      parse_mode: "HTML",
    });
  }
}

/** /pr <title> — create a pull request */
export async function handlePR(ctx: Context, args: string[]): Promise<void> {
  if (args.length === 0) {
    await ctx.reply(formatError("Usage: /pr <title>"), {
      parse_mode: "HTML",
    });
    return;
  }

  const title = args.join(" ");

  try {
    // Push current branch first
    const branch = git("branch --show-current").trim();
    try {
      git(`push -u origin ${branch}`);
    } catch {
      // May already be pushed — continue
    }

    // Create PR using gh CLI
    const result = execSync(
      `gh pr create --title ${JSON.stringify(title)} --body "Created via Locus Telegram Bot" --head ${branch}`,
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd(),
      }
    );

    const prMatch = result.match(/\/pull\/(\d+)/);
    const prNumber = prMatch ? Number(prMatch[1]) : 0;

    await ctx.reply(prCreatedMessage(prNumber, result.trim()), {
      parse_mode: "HTML",
    });
  } catch (error: unknown) {
    await ctx.reply(formatError("Failed to create PR", String(error)), {
      parse_mode: "HTML",
    });
  }
}
