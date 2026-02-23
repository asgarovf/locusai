import { LocusClient } from "@locusai/sdk";
import type { AiProvider } from "@locusai/sdk/node";
import { DEFAULT_MODEL } from "@locusai/sdk/node";
import { resolveProvider } from "./config.js";
import { SettingsManager } from "./settings.js";
import { WorkspaceResolver } from "./workspace.js";

const DEFAULT_API_BASE = "https://api.locusai.dev/api";

export interface ApiContextOptions {
  projectPath: string;
  apiKey?: string;
  apiUrl?: string;
  workspaceId?: string;
  provider?: string;
  model?: string;
}

export interface ApiContext {
  client: LocusClient;
  workspaceId: string;
  apiKey: string;
  apiBase: string;
}

export interface AiSettings {
  provider: AiProvider;
  model: string;
}

/**
 * Resolve API context (client + workspace) from options and settings.
 * Merges explicit options with persisted settings. Throws on missing API key.
 */
export async function resolveApiContext(
  options: ApiContextOptions
): Promise<ApiContext> {
  const settings = new SettingsManager(options.projectPath).load();

  const apiKey = options.apiKey || settings.apiKey;
  if (!apiKey) {
    throw new Error(
      "API key is required. Configure with: locus config setup --api-key <key>"
    );
  }

  const apiBase = options.apiUrl || settings.apiUrl || DEFAULT_API_BASE;

  const resolver = new WorkspaceResolver({
    apiKey,
    apiBase,
    workspaceId: options.workspaceId,
  });

  const workspaceId = await resolver.resolve();

  const client = new LocusClient({
    baseUrl: apiBase,
    token: apiKey,
  });

  return { client, workspaceId, apiKey, apiBase };
}

/**
 * Resolve AI provider and model from options and settings.
 * Merges explicit options with persisted settings, applying defaults.
 */
export function resolveAiSettings(options: ApiContextOptions): AiSettings {
  const settings = new SettingsManager(options.projectPath).load();

  const provider = resolveProvider(options.provider || settings.provider);
  const model = options.model || settings.model || DEFAULT_MODEL[provider];

  return { provider, model };
}
