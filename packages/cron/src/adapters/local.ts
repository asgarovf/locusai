/**
 * Local output adapter — writes cron job results to
 * `.locus/cron/<jobId>/output.log`.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CronJobResult, OutputAdapter } from "../types.js";

export function createLocalAdapter(cwd: string): OutputAdapter {
  const cronBaseDir = join(cwd, ".locus", "cron");

  return {
    name: "local",

    async send(result: CronJobResult): Promise<void> {
      const jobDir = join(cronBaseDir, result.jobId);
      if (!existsSync(jobDir)) {
        mkdirSync(jobDir, { recursive: true });
      }

      const logPath = join(jobDir, "output.log");
      const status = result.exitCode === 0 ? "OK" : `EXIT ${result.exitCode}`;
      const line = `[${result.timestamp.toISOString()}] [${status}] ${result.output}`;

      try {
        appendFileSync(logPath, `${line}\n`);
      } catch {
        console.error(
          `[local-adapter] Failed to write log for job "${result.jobId}": ${line}`
        );
      }
    },
  };
}
