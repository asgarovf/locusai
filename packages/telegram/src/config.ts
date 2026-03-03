/**
 * Configuration for the Telegram bot, read from the Locus config system.
 *
 * Users configure via:
 *   locus config set packages.telegram.botToken "123456:ABC..."
 *   locus config set packages.telegram.chatIds "12345678,87654321"
 */

import { readLocusConfig } from "@locusai/sdk";

export interface TelegramConfig {
  botToken: string;
  allowedChatIds: number[];
}

export function loadTelegramConfig(): TelegramConfig {
  const locusConfig = readLocusConfig();
  const pkg = locusConfig.packages?.telegram;

  const botToken = pkg?.botToken;
  if (!botToken || typeof botToken !== "string") {
    throw new Error(
      'Telegram bot token not configured. Run:\n  locus config set packages.telegram.botToken "<your-token>"\n\nGet a token from @BotFather on Telegram.'
    );
  }

  const chatIdsRaw = pkg?.chatIds;
  if (!chatIdsRaw) {
    throw new Error(
      'Telegram chat IDs not configured. Run:\n  locus config packages.telegram.chatIds "12345678"\n\nSend /start to your bot, then use the chat ID from the Telegram API.'
    );
  }

  const allowedChatIds = parseChatIds(chatIdsRaw);

  if (allowedChatIds.length === 0) {
    throw new Error(
      "packages.telegram.chatIds must contain at least one chat ID."
    );
  }

  return { botToken, allowedChatIds };
}

function parseChatIds(raw: unknown): number[] {
  // Support both array of numbers and comma-separated string
  if (Array.isArray(raw)) {
    return raw.map((id) => {
      const parsed = Number(id);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid chat ID: "${id}". Must be a number.`);
      }
      return parsed;
    });
  }

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .map((id) => {
        const parsed = Number.parseInt(id, 10);
        if (Number.isNaN(parsed)) {
          throw new Error(`Invalid chat ID: "${id}". Must be a number.`);
        }
        return parsed;
      });
  }

  if (typeof raw === "number") {
    return [raw];
  }

  throw new Error(
    "Invalid chatIds format. Expected a number, array of numbers, or comma-separated string."
  );
}
