/**
 * Cron worker — runs as a standalone PM2 process.
 *
 * Reads cron config, starts the scheduler, writes output to .locus/cron/.
 */

import { startHeartbeat } from "@locusai/locus-pm2";
import { createLogger } from "@locusai/sdk";
import { loadCronConfig } from "./config.js";
import { CronScheduler } from "./scheduler.js";

const logger = createLogger("cron");

export async function runWorker(): Promise<void> {
  const config = loadCronConfig();

  if (!config.enabled) {
    logger.warn(
      "Cron is disabled. Enable via: locus config set packages.cron.enabled true"
    );
    process.exit(0);
  }

  if (config.crons.length === 0) {
    logger.warn(
      "No crons configured. Add crons to packages.cron.crons in .locus/config.json"
    );
    process.exit(0);
  }

  const scheduler = new CronScheduler(config, process.cwd());
  scheduler.start();

  const stopHeartbeat = startHeartbeat({
    processName: "locus-cron",
    logger,
  });

  logger.info(`Cron worker started with ${config.crons.length} job(s)`);

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down cron worker...");
    stopHeartbeat();
    scheduler.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
