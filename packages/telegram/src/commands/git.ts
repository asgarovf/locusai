/**
 * Git command handlers — stage, commit, stash, branch, checkout, diff, PR.
 *
 * Uses direct git subprocess calls for fast, local operations.
 * PR creation uses `gh` CLI (same as the locus CLI does).
 */

import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import type { Context } from "grammy";
import { commandTracker } from "../tracker.js";
import {
  bold,
  codeBlock,
  escapeHtml,
  formatConflictMessage,
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

const exec = promisify(execCb);

// ─── Git Helper ─────────────────────────────────────────────────────────────

async function git(args: string): Promise<string> {
  const { stdout } = await exec(`git ${args}`, { cwd: process.cwd() });
  return stdout;
}

async function gitSafe(args: string): Promise<string | null> {
  try {
    return await git(args);
  } catch {
    return null;
  }
}

// ─── Tracking Helper ────────────────────────────────────────────────────────

async function tracked(
  ctx: Context,
  command: string,
  args: string[],
  fn: () => Promise<void>
): Promise<void> {
  const chatId = ctx.chat!.id;

  // Concurrency guard — prevent conflicting exclusive commands
  const conflict = commandTracker.checkExclusiveConflict(chatId, command);
  if (conflict) {
    await ctx.reply(formatConflictMessage(command, conflict.runningCommand), {
      parse_mode: "HTML",
    });
    return;
  }

  const id = commandTracker.track(chatId, command, args);
  try {
    await fn();
  } finally {
    commandTracker.untrack(chatId, id);
  }
}

// ─── Command Handlers ───────────────────────────────────────────────────────

/** /gitstatus — show git status */
export async function handleGitStatus(ctx: Context): Promise<void> {
  await tracked(ctx, "gitstatus", [], async () => {
    try {
      const status = await git("status --short");
      if (!status.trim()) {
        await ctx.reply(formatSuccess("Working tree is clean."), {
          parse_mode: "HTML",
        });
        return;
      }

      const branch = (await git("branch --show-current")).trim();
      await ctx.reply(
        `${bold("Branch:")} ${escapeHtml(branch)}\n\n${codeBlock(status)}`,
        { parse_mode: "HTML" }
      );
    } catch (error: unknown) {
      await ctx.reply(
        formatError("Failed to get git status", String(error)),
        { parse_mode: "HTML" }
      );
    }
  });
}

/** /stage [files|.] — stage files for commit */
export async function handleStage(
  ctx: Context,
  args: string[]
): Promise<void> {
  await tracked(ctx, "stage", args, async () => {
    const target = args.length > 0 ? args.join(" ") : ".";

    try {
      await git(`add ${target}`);
      const status = await git("status --short");
      await ctx.reply(
        `${formatSuccess(`Staged: ${target}`)}\n\n${codeBlock(status)}`,
        { parse_mode: "HTML" }
      );
    } catch (error: unknown) {
      await ctx.reply(formatError("Failed to stage files", String(error)), {
        parse_mode: "HTML",
      });
    }
  });
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

  await tracked(ctx, "commit", args, async () => {
    const message = args.join(" ");

    try {
      const result = await git(`commit -m ${JSON.stringify(message)}`);
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
          { parse_mode: "HTML" }
        );
      } else {
        await ctx.reply(formatError("Failed to commit", errStr), {
          parse_mode: "HTML",
        });
      }
    }
  });
}

/** /stash [pop|list|drop|save] — stash operations */
export async function handleStash(
  ctx: Context,
  args: string[]
): Promise<void> {
  await tracked(ctx, "stash", args, async () => {
    const subcommand = args[0] ?? "push";

    try {
      switch (subcommand) {
        case "push":
        case "save": {
          const message = args.slice(1).join(" ");
          const stashArgs = message
            ? `stash push -m ${JSON.stringify(message)}`
            : "stash push";
          await git(stashArgs);
          await ctx.reply(gitStashMessage("Changes stashed"), {
            parse_mode: "HTML",
            reply_markup: stashKeyboard(),
          });
          break;
        }
        case "pop": {
          await git("stash pop");
          await ctx.reply(gitStashMessage("Stash popped"), {
            parse_mode: "HTML",
          });
          break;
        }
        case "list": {
          const list = (await gitSafe("stash list")) ?? "";
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
          await git(`stash drop ${stashRef}`);
          await ctx.reply(gitStashMessage(`Dropped ${stashRef}`), {
            parse_mode: "HTML",
          });
          break;
        }
        default: {
          // Default: just stash
          await git("stash push");
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
  });
}

/** /branch [name] — list branches or create a new one */
export async function handleBranch(
  ctx: Context,
  args: string[]
): Promise<void> {
  await tracked(ctx, "branch", args, async () => {
    try {
      if (args.length === 0) {
        // List branches
        const branches = await git("branch -a --format='%(refname:short)'");
        const current = (await git("branch --show-current")).trim();
        await ctx.reply(
          `${bold("Current:")} ${escapeHtml(current)}\n\n${codeBlock(branches)}`,
          { parse_mode: "HTML" }
        );
      } else {
        // Create new branch
        const branchName = args[0];
        await git(`branch ${branchName}`);
        await ctx.reply(gitBranchCreatedMessage(branchName), {
          parse_mode: "HTML",
        });
      }
    } catch (error: unknown) {
      await ctx.reply(formatError("Branch operation failed", String(error)), {
        parse_mode: "HTML",
      });
    }
  });
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

  await tracked(ctx, "checkout", args, async () => {
    const branch = args[0];

    try {
      await git(`checkout ${branch}`);
      await ctx.reply(gitCheckoutMessage(branch), { parse_mode: "HTML" });
    } catch (error: unknown) {
      await ctx.reply(formatError("Checkout failed", String(error)), {
        parse_mode: "HTML",
      });
    }
  });
}

/** /diff — show git diff summary */
export async function handleDiff(ctx: Context): Promise<void> {
  await tracked(ctx, "diff", [], async () => {
    try {
      const diff = await git("diff --stat");
      if (!diff.trim()) {
        const staged = await git("diff --cached --stat");
        if (!staged.trim()) {
          await ctx.reply(formatSuccess("No changes."), {
            parse_mode: "HTML",
          });
        } else {
          await ctx.reply(
            `${bold("Staged changes:")}\n\n${codeBlock(staged)}`,
            { parse_mode: "HTML" }
          );
        }
      } else {
        await ctx.reply(
          `${bold("Unstaged changes:")}\n\n${codeBlock(diff)}`,
          { parse_mode: "HTML" }
        );
      }
    } catch (error: unknown) {
      await ctx.reply(formatError("Diff failed", String(error)), {
        parse_mode: "HTML",
      });
    }
  });
}

/** /pr <title> — create a pull request */
export async function handlePR(ctx: Context, args: string[]): Promise<void> {
  if (args.length === 0) {
    await ctx.reply(formatError("Usage: /pr <title>"), {
      parse_mode: "HTML",
    });
    return;
  }

  await tracked(ctx, "pr", args, async () => {
    const title = args.join(" ");

    try {
      // Push current branch first
      const branch = (await git("branch --show-current")).trim();
      try {
        await git(`push -u origin ${branch}`);
      } catch {
        // May already be pushed — continue
      }

      // Create PR using gh CLI
      const { stdout: result } = await exec(
        `gh pr create --title ${JSON.stringify(title)} --body "Created via Locus Telegram Bot" --head ${branch}`,
        { cwd: process.cwd() }
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
  });
}
