/**
 * Sync orchestrator — runs provider bridges in parallel and merges results.
 *
 * Supports syncing to all providers at once or a single provider.
 * Filters servers by per-server `providers` metadata and the global
 * `defaultProviders` list from templates.
 */

import type { McpServerConfig, ProviderBridge, SyncResult } from "../types.js";
import { ClaudeBridge } from "./claude.js";
import { CodexBridge } from "./codex.js";

// ---------------------------------------------------------------------------
// Default bridges
// ---------------------------------------------------------------------------

const DEFAULT_BRIDGES: ProviderBridge[] = [
  new ClaudeBridge(),
  new CodexBridge("project"),
];

/** Supported provider names. */
export type ProviderName = "claude" | "codex";

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

/**
 * Sync canonical servers to all provider-specific configs in parallel.
 *
 * Filters disabled servers and respects per-server `metadata.providers`
 * arrays (if set) to limit which providers a server syncs to.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param servers - All canonical servers from `.locus/mcp.json`.
 * @param bridges - Provider bridges to use. Defaults to Claude + Codex.
 * @returns Merged results from all bridges.
 */
export async function syncAll(
  projectRoot: string,
  servers: Record<string, McpServerConfig>,
  bridges: ProviderBridge[] = DEFAULT_BRIDGES
): Promise<SyncResult[]> {
  const results = await Promise.all(
    bridges.map((bridge) => syncProvider(projectRoot, bridge, servers))
  );
  return results;
}

/**
 * Sync canonical servers to a single provider.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param bridge - The provider bridge to sync with.
 * @param servers - All canonical servers from `.locus/mcp.json`.
 * @returns The sync result for this provider.
 */
export async function syncProvider(
  projectRoot: string,
  bridge: ProviderBridge,
  servers: Record<string, McpServerConfig>
): Promise<SyncResult> {
  // Filter to servers that target this provider
  const filtered = filterServersForProvider(servers, bridge.provider);
  return bridge.sync(projectRoot, filtered);
}

/**
 * Filter servers to only those targeting a specific provider.
 *
 * A server targets a provider if:
 *   1. It has no `metadata.providers` array (syncs to all providers), or
 *   2. Its `metadata.providers` array includes the provider name.
 *
 * Disabled servers are excluded.
 */
function filterServersForProvider(
  servers: Record<string, McpServerConfig>,
  provider: string
): Record<string, McpServerConfig> {
  const result: Record<string, McpServerConfig> = {};

  for (const [name, config] of Object.entries(servers)) {
    if (!config.enabled) continue;

    const providers = config.metadata?.providers;
    if (Array.isArray(providers) && !providers.includes(provider)) {
      continue;
    }

    result[name] = config;
  }

  return result;
}

/**
 * Print a formatted summary of sync results to stdout.
 */
export function printSyncResults(results: SyncResult[]): void {
  for (const result of results) {
    const status = result.changed ? "updated" : "no changes";
    console.log(
      `  ${result.provider}: ${result.serversWritten} server(s) synced (${status}) → ${result.configPath}`
    );

    if (result.serversRemoved.length > 0) {
      console.log(`    removed: ${result.serversRemoved.join(", ")}`);
    }

    for (const error of result.errors) {
      console.log(`    ⚠ ${error}`);
    }
  }
}

/** Get a bridge instance by provider name. */
export function getBridge(provider: ProviderName): ProviderBridge {
  switch (provider) {
    case "claude":
      return new ClaudeBridge();
    case "codex":
      return new CodexBridge("project");
  }
}
