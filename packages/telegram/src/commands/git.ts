import type { Context } from "telegraf";
import { validateGitCommand } from "../command-whitelist.js";
import type { TelegramConfig } from "../config.js";
import { formatCommandOutput, formatError, formatInfo } from "../formatter.js";
import { executeShellCommand } from "../shell-executor.js";
import { GIT_TIMEOUT } from "../timeouts.js";

const USAGE = `<b>Usage:</b> /git &lt;command&gt;

<b>Git:</b>
  status, log, diff, diff --staged
  branch, branch &lt;name&gt;
  checkout &lt;branch&gt;, checkout -b &lt;branch&gt;
  switch &lt;branch&gt;, switch -c &lt;branch&gt;
  add &lt;files&gt;, add .
  commit -m "message"
  push, push -u origin &lt;branch&gt;
  pull
  stash, stash pop, stash list

<b>GitHub CLI:</b>
  gh pr list
  gh pr view [number]
  gh pr create "title" "body (optional)"`;

export async function gitCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const input = text.replace(/^\/git\s*/, "").trim();

  console.log(`[git] Received: ${input || "(empty)"}`);

  if (!input) {
    await ctx.reply(formatInfo(USAGE), { parse_mode: "HTML" });
    return;
  }

  const validation = validateGitCommand(input);

  if (!validation.ok || !validation.command) {
    await ctx.reply(formatError(validation.error || "Invalid command"), {
      parse_mode: "HTML",
    });
    return;
  }

  const { binary, args } = validation.command;
  const display = `${binary} ${args.join(" ")}`;

  await ctx.reply(formatInfo(`Running: <code>${display}</code>`), {
    parse_mode: "HTML",
  });

  const result = await executeShellCommand(validation.command, {
    cwd: config.projectPath,
    timeout: GIT_TIMEOUT,
  });

  const output = (result.stdout + result.stderr).trim();

  if (result.killed) {
    await ctx.reply(formatError("Command timed out and was killed."), {
      parse_mode: "HTML",
    });
    return;
  }

  await ctx.reply(formatCommandOutput(display, output, result.exitCode), {
    parse_mode: "HTML",
  });
}
