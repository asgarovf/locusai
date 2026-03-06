/**
 * Service management commands — PM2 lifecycle control via Telegram.
 */

import {
  pm2Delete,
  pm2Logs,
  pm2Restart,
  pm2Start,
  pm2Status,
  pm2Stop,
} from "@locusai/locus-pm2";
import type { Context } from "grammy";
import { getTelegramPm2Config } from "../config.js";
import { codeBlock, formatError, formatSuccess } from "../ui/format.js";
import {
  serviceNotRunningMessage,
  serviceStatusMessage,
} from "../ui/messages.js";

/** /service <subcommand> — manage the bot process */
export async function handleService(
  ctx: Context,
  args: string[]
): Promise<void> {
  const subcommand = args[0] ?? "status";

  try {
    switch (subcommand) {
      case "start": {
        const result = pm2Start(getTelegramPm2Config());
        await ctx.reply(formatSuccess(result), { parse_mode: "HTML" });
        break;
      }
      case "stop": {
        const result = pm2Stop(getTelegramPm2Config());
        await ctx.reply(formatSuccess(result), { parse_mode: "HTML" });
        break;
      }
      case "restart": {
        const result = pm2Restart(getTelegramPm2Config());
        await ctx.reply(formatSuccess(result), { parse_mode: "HTML" });
        break;
      }
      case "delete": {
        const result = pm2Delete(getTelegramPm2Config());
        await ctx.reply(formatSuccess(result), { parse_mode: "HTML" });
        break;
      }
      case "status": {
        const status = pm2Status(getTelegramPm2Config());
        if (!status) {
          await ctx.reply(serviceNotRunningMessage(), {
            parse_mode: "HTML",
          });
        } else {
          await ctx.reply(
            serviceStatusMessage(
              status.status,
              status.pid,
              status.uptime,
              status.memory,
              status.restarts
            ),
            { parse_mode: "HTML" }
          );
        }
        break;
      }
      case "logs": {
        const lines = args[1] ? Number(args[1]) : 50;
        const logs = pm2Logs(getTelegramPm2Config(), lines);
        await ctx.reply(codeBlock(logs), { parse_mode: "HTML" });
        break;
      }
      default: {
        await ctx.reply(
          formatError(
            "Unknown service command. Use: start, stop, restart, delete, status, logs"
          ),
          { parse_mode: "HTML" }
        );
      }
    }
  } catch (error: unknown) {
    await ctx.reply(formatError("Service command failed", String(error)), {
      parse_mode: "HTML",
    });
  }
}
