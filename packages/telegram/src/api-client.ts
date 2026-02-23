import {
  resolveWorkspaceId as baseResolveWorkspaceId,
  resolveApiContext,
} from "@locusai/commands";
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
  console.log("[workspace] Resolving workspace from API key...");
  const workspaceId = await baseResolveWorkspaceId(client, config.workspaceId);
  console.log(`[workspace] Resolved workspace: ${workspaceId}`);
  return workspaceId;
}

export async function getClientAndWorkspace(
  config: TelegramConfig
): Promise<{ client: LocusClient; workspaceId: string }> {
  const { client, workspaceId } = await resolveApiContext({
    projectPath: config.projectPath,
    apiKey: config.apiKey,
    apiUrl: config.apiBase,
    workspaceId: config.workspaceId,
  });
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
