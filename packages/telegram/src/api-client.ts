import { LocusClient } from "@locusai/sdk";
import type { Context } from "telegraf";
import type { TelegramConfig } from "./config.js";
import { formatError } from "./formatter.js";

export function createClient(config: TelegramConfig): LocusClient {
  return new LocusClient({
    baseUrl: config.apiBase || "https://api.locusai.dev/api",
    token: config.apiKey,
  });
}

export async function resolveWorkspaceId(
  client: LocusClient,
  config: TelegramConfig
): Promise<string> {
  if (config.workspaceId) {
    return config.workspaceId;
  }

  console.log("[workspace] Resolving workspace from API key...");
  const info = await client.auth.getApiKeyInfo();
  if (info.workspaceId) {
    console.log(`[workspace] Resolved workspace: ${info.workspaceId}`);
    return info.workspaceId;
  }

  throw new Error(
    "Could not resolve workspace from API key. Please set workspaceId in settings."
  );
}

export async function getClientAndWorkspace(
  config: TelegramConfig
): Promise<{ client: LocusClient; workspaceId: string }> {
  const client = createClient(config);
  const workspaceId = await resolveWorkspaceId(client, config);
  return { client, workspaceId };
}

export async function requireApiKey(
  ctx: Context,
  config: TelegramConfig,
  command: string
): Promise<boolean> {
  if (config.apiKey) {
    return true;
  }

  await ctx.reply(
    formatError(
      `API key is required for /${command}. Run: locus config setup --api-key <KEY>`
    ),
    { parse_mode: "HTML" }
  );
  return false;
}
