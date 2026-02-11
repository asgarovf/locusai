import type { Context } from "telegraf";
import { validateDevCommand } from "../command-whitelist.js";
import type { TelegramConfig } from "../config.js";
import { formatCommandOutput, formatError, formatInfo } from "../formatter.js";
import { executeShellCommand } from "../shell-executor.js";
import { DEV_TIMEOUT } from "../timeouts.js";

const USAGE = `<b>Usage:</b> /dev &lt;command&gt;

<b>Available commands:</b>
  lint — Run biome lint
  typecheck — Run tsc --noEmit
  build — Run bun run build
  test — Run bun test`;

export async function devCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const input = text.replace(/^\/dev\s*/, "").trim();

  console.log(`[dev] Received: ${input || "(empty)"}`);

  if (!input) {
    await ctx.reply(formatInfo(USAGE), { parse_mode: "HTML" });
    return;
  }

  const validation = validateDevCommand(input);

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
    timeout: DEV_TIMEOUT,
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
