/**
 * Output adapter registry — maps adapter names to adapter instances.
 */

import type { OutputAdapter } from "../types.js";
import { createLocalAdapter } from "./local.js";
import { createTelegramAdapter } from "./telegram.js";
import { createWebhookAdapter } from "./webhook.js";

const DEFAULT_ROUTES = ["local"];

/**
 * Resolve a list of route names to their corresponding output adapters.
 * Falls back to `["local"]` when no routes are specified.
 */
export function resolveAdapters(
  routes: string[] | undefined,
  cwd: string
): OutputAdapter[] {
  const targets = routes && routes.length > 0 ? routes : DEFAULT_ROUTES;

  const adapters: OutputAdapter[] = [];

  for (const route of targets) {
    switch (route) {
      case "local":
        adapters.push(createLocalAdapter(cwd));
        break;
      case "telegram":
        adapters.push(createTelegramAdapter());
        break;
      default:
        if (route.startsWith("webhook:")) {
          const url = route.slice("webhook:".length);
          adapters.push(createWebhookAdapter(url));
        } else {
          console.warn(`[cron] Unknown output route: "${route}", skipping.`);
        }
    }
  }

  return adapters;
}
