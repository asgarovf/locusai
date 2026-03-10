/**
 * Health check for MCP servers.
 *
 * Connects to a server, sends initialize, lists tools, and measures
 * round-trip response time. Returns a structured `HealthCheckResult`.
 */

import { McpTestClient } from "../client/test-client.js";
import type { HealthCheckResult, McpServerConfig } from "../types.js";

/** Options for health checks. */
export interface HealthCheckOptions {
  /** Connection and request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number;
}

/**
 * Check the health of a single MCP server.
 *
 * Connects to the server, lists its tools, measures latency, and
 * disconnects cleanly. Returns `healthy: false` with a descriptive
 * error on any failure — never throws.
 *
 * @param name - Server name (used in the result for identification).
 * @param config - Server configuration from `.locus/mcp.json`.
 * @param options - Optional timeout configuration.
 */
export async function checkServerHealth(
  name: string,
  config: McpServerConfig,
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
  const client = new McpTestClient({ timeoutMs: options.timeoutMs });
  const start = Date.now();

  try {
    await client.connect(config);

    const { tools } = await client.listTools();
    const latencyMs = Date.now() - start;

    return {
      name,
      healthy: true,
      latencyMs,
      toolCount: tools.length,
      toolNames: tools.map((t) => t.name),
    };
  } catch (err) {
    return {
      name,
      healthy: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await client.disconnect();
  }
}

/**
 * Check the health of multiple MCP servers in parallel.
 *
 * @param servers - Map of server name → config.
 * @param options - Optional timeout configuration.
 */
export async function checkAllServersHealth(
  servers: Record<string, McpServerConfig>,
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult[]> {
  const entries = Object.entries(servers).filter(([, cfg]) => cfg.enabled);

  const results = await Promise.all(
    entries.map(([name, config]) => checkServerHealth(name, config, options))
  );

  return results;
}
