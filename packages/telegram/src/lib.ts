/**
 * Library exports for @locusai/telegram.
 *
 * This module provides the public API for consumers (e.g. the CLI daemon)
 * who need to create a JobNotifier or interact with Telegram notifications
 * without starting the full bot.
 */

import { Telegraf } from "telegraf";
import { JobNotifier } from "./notifications.js";

export { type CreateBotResult, createBot } from "./bot.js";
export { resolveConfig, type TelegramConfig } from "./config.js";
export { JobNotifier } from "./notifications.js";

/**
 * Create a standalone JobNotifier for sending Telegram notifications.
 * This creates a minimal Telegraf instance used only for sending messages
 * (no command handlers or polling).
 */
export function createNotifier(botToken: string, chatId: number): JobNotifier {
  const bot = new Telegraf(botToken);
  return new JobNotifier(bot, chatId);
}
