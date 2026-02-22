#!/usr/bin/env node

import "dotenv/config";
import { createBot } from "./bot.js";
import { resolveConfig } from "./config.js";
import { ProposalScheduler } from "./scheduler.js";

async function main(): Promise<void> {
  console.log("Locus Telegram Bot");
  console.log("----------------------------------------------");

  const config = resolveConfig();

  console.log(`Project: ${config.projectPath}`);
  console.log(`Chat ID: ${config.chatId}`);
  console.log(`API Base: ${config.apiBase || "https://api.locusai.dev/api"}`);
  console.log(`API Key: ${config.apiKey ? "configured" : "not set"}`);
  console.log("----------------------------------------------\n");

  const { bot, notifier } = createBot(config);

  // Start proposal scheduler (embedded — replaces standalone daemon)
  const scheduler = new ProposalScheduler(config, notifier);
  await scheduler.start();

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down...`);
    scheduler.stop();
    bot.stop(signal);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log("Starting bot (long-polling)...\n");
  await bot.launch({ dropPendingUpdates: true });
  console.log("Bot is running. Send /help in Telegram to get started.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
