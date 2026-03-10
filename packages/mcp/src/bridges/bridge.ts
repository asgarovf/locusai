/**
 * Bridge interface and shared types for provider-specific config sync.
 *
 * Re-exports the canonical ProviderBridge and SyncResult types from types.ts.
 * Bridges translate `.locus/mcp.json` into provider-specific formats
 * (e.g. Claude's `.claude/mcp.json`, Codex's `.codex/config.toml`).
 *
 * Convention: all locus-managed servers are prefixed with `locus-` in provider
 * configs to avoid conflicts with user-managed servers.
 */

export type { ProviderBridge, SyncResult } from "../types.js";

/** Prefix applied to server names in provider configs. */
export const LOCUS_SERVER_PREFIX = "locus-";

/** Check if a server name is locus-managed. */
export function isLocusManaged(name: string): boolean {
  return name.startsWith(LOCUS_SERVER_PREFIX);
}

/** Add the locus prefix to a server name. */
export function toLocusName(name: string): string {
  return `${LOCUS_SERVER_PREFIX}${name}`;
}

/** Strip the locus prefix from a server name. Returns null if not locus-managed. */
export function fromLocusName(name: string): string | null {
  if (!isLocusManaged(name)) return null;
  return name.slice(LOCUS_SERVER_PREFIX.length);
}
