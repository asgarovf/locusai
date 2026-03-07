/**
 * Webhook output adapter — POSTs cron job results as JSON to an arbitrary URL.
 */

import type { CronJobResult, OutputAdapter } from "../types.js";

export function createWebhookAdapter(url: string): OutputAdapter {
  return {
    name: "webhook",

    async send(result: CronJobResult): Promise<void> {
      const payload = JSON.stringify({
        jobId: result.jobId,
        command: result.command,
        output: result.output,
        exitCode: result.exitCode,
        timestamp: result.timestamp,
        schedule: result.schedule,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `[webhook-adapter] POST to ${url} failed: ${response.status} ${errorBody}`
        );
      }
    },
  };
}
