/**
 * /cancel command — abort running commands for the current chat.
 *
 * - No active commands  → informational message
 * - One active command  → kill immediately, confirm
 * - Multiple commands   → inline keyboard to pick which to cancel (or all)
 */

import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { commandTracker } from "../tracker.js";
import { bold, escapeHtml, italic } from "../ui/format.js";

/** Callback data prefix for cancel selection. */
export const CANCEL_CMD_PREFIX = "cancel:cmd:";
export const CANCEL_ALL = "cancel:all";

/** /cancel handler */
export async function handleCancel(ctx: Context): Promise<void> {
  const chatId = ctx.chat!.id;
  const active = commandTracker.getActive(chatId);

  if (active.length === 0) {
    await ctx.reply(`ℹ️ No commands are currently running.`, {
      parse_mode: "HTML",
    });
    return;
  }

  if (active.length === 1) {
    const cmd = active[0];
    commandTracker.kill(chatId, cmd.id);
    await ctx.reply(
      `🛑 Cancelled ${bold(`/${escapeHtml(cmd.command)}`)}${cmd.args.length ? ` ${escapeHtml(cmd.args.join(" "))}` : ""}`,
      { parse_mode: "HTML" }
    );
    return;
  }

  // Multiple commands — show selection keyboard
  const kb = new InlineKeyboard();
  for (const cmd of active) {
    const label = `/${cmd.command}${cmd.args.length ? ` ${cmd.args.join(" ")}` : ""}`;
    kb.text(`🛑 ${label}`, `${CANCEL_CMD_PREFIX}${cmd.id}`).row();
  }
  kb.text("🛑 Cancel All", CANCEL_ALL);

  await ctx.reply(
    `${bold("Multiple commands running:")}\n\n${italic("Select which to cancel:")}`,
    { parse_mode: "HTML", reply_markup: kb }
  );
}

/** Handle callback for cancelling a specific command. */
export async function handleCancelCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const chatId = ctx.chat!.id;

  if (data === CANCEL_ALL) {
    const count = commandTracker.killAll(chatId);
    await ctx.answerCallbackQuery({ text: `Cancelled ${count} command(s)` });
    await ctx.editMessageText(`🛑 Cancelled ${bold(`${count} command(s)`)}.`, {
      parse_mode: "HTML",
    });
    return;
  }

  if (data.startsWith(CANCEL_CMD_PREFIX)) {
    const id = data.slice(CANCEL_CMD_PREFIX.length);
    const killed = commandTracker.kill(chatId, id);
    if (killed) {
      await ctx.answerCallbackQuery({ text: "Command cancelled" });
      await ctx.editMessageText(`🛑 Command cancelled.`, {
        parse_mode: "HTML",
      });
    } else {
      await ctx.answerCallbackQuery({
        text: "Command already finished",
      });
      await ctx.editMessageText(`ℹ️ Command already finished.`, {
        parse_mode: "HTML",
      });
    }
  }
}
