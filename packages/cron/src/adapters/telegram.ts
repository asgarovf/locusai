/**
 * Telegram output adapter — sends cron job results to configured
 * Telegram chats via the Bot API.
 */

import { readLocusConfig } from "@locusai/sdk";
import type { CronJobResult, OutputAdapter } from "../types.js";

const TELEGRAM_MESSAGE_LIMIT = 4096;
const OUTPUT_TRUNCATE_LIMIT = 3500;

interface TelegramAdapterConfig {
  botToken: string;
  chatIds: number[];
}

function loadTelegramAdapterConfig(): TelegramAdapterConfig {
  const locusConfig = readLocusConfig();
  const pkg = locusConfig.packages?.telegram;

  const botToken = pkg?.botToken;
  if (!botToken || typeof botToken !== "string") {
    throw new Error(
      "[telegram-adapter] Telegram bot token not configured. Run:\n  locus config set packages.telegram.botToken \"<your-token>\""
    );
  }

  const chatIdsRaw = pkg?.chatIds;
  if (!chatIdsRaw) {
    throw new Error(
      "[telegram-adapter] Telegram chat IDs not configured. Run:\n  locus config set packages.telegram.chatIds \"<chat-id>\""
    );
  }

  const chatIds = parseChatIds(chatIdsRaw);
  if (chatIds.length === 0) {
    throw new Error(
      "[telegram-adapter] packages.telegram.chatIds must contain at least one chat ID."
    );
  }

  return { botToken, chatIds };
}

function parseChatIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((id) => {
      const parsed = Number(id);
      if (Number.isNaN(parsed)) {
        throw new Error(`[telegram-adapter] Invalid chat ID: "${id}".`);
      }
      return parsed;
    });
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const parsed = Number.parseInt(s, 10);
        if (Number.isNaN(parsed)) {
          throw new Error(`[telegram-adapter] Invalid chat ID: "${s}".`);
        }
        return parsed;
      });
  }
  if (typeof raw === "number") {
    return [raw];
  }
  throw new Error(
    "[telegram-adapter] Invalid chatIds format. Expected a number, array, or comma-separated string."
  );
}

function truncateOutput(output: string): string {
  if (output.length <= OUTPUT_TRUNCATE_LIMIT) {
    return output;
  }
  return `${output.slice(0, OUTPUT_TRUNCATE_LIMIT)}... (truncated)`;
}

function formatMessage(result: CronJobResult): string {
  const statusIcon = result.exitCode === 0 ? "OK" : "FAILED";
  const truncatedOutput = truncateOutput(result.output);

  const lines = [
    `*Cron: ${escapeMarkdown(result.jobId)}*`,
    "",
    `Command: \`${escapeMarkdown(result.command)}\``,
    `Status: ${statusIcon} (exit code ${result.exitCode})`,
    `Schedule: ${escapeMarkdown(result.schedule)}`,
    `Time: ${result.timestamp.toISOString()}`,
  ];

  if (truncatedOutput.trim()) {
    lines.push("", `\`\`\`\n${truncatedOutput}\n\`\`\``);
  }

  return lines.join("\n");
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text: text.slice(0, TELEGRAM_MESSAGE_LIMIT),
    parse_mode: "MarkdownV2",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[telegram-adapter] Failed to send message to chat ${chatId}: ${response.status} ${errorBody}`
    );
  }
}

export function createTelegramAdapter(): OutputAdapter {
  const config = loadTelegramAdapterConfig();

  return {
    name: "telegram",

    async send(result: CronJobResult): Promise<void> {
      const message = formatMessage(result);

      const errors: Error[] = [];
      for (const chatId of config.chatIds) {
        try {
          await sendTelegramMessage(config.botToken, chatId, message);
        } catch (err) {
          errors.push(
            err instanceof Error ? err : new Error(String(err))
          );
        }
      }

      if (errors.length === config.chatIds.length) {
        throw new Error(
          `[telegram-adapter] Failed to send to all chats: ${errors.map((e) => e.message).join("; ")}`
        );
      }
    },
  };
}
