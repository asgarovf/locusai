/**
 * `locus mcp status` — Show MCP config and provider sync status.
 *
 * Displays the canonical config summary and checks whether each provider's
 * config file exists and is in sync with the canonical config.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fromLocusName } from "../bridges/bridge.js";
import { ClaudeBridge } from "../bridges/claude.js";
import { CodexBridge } from "../bridges/codex.js";
import type { ProviderBridge } from "../types.js";
import { filterServersForProvider } from "../bridges/sync.js";
import { McpConfigStore } from "../config/store.js";

// ─── Command ────────────────────────────────────────────────────────────────

export async function statusCommand(
  projectRoot: string,
  _args: string[]
): Promise<void> {
  const store = new McpConfigStore(projectRoot);
  const config = store.load();
  const servers = config.servers;

  const serverCount = Object.keys(servers).length;
  const enabledCount = Object.values(servers).filter((s) => s.enabled).length;
  const disabledCount = serverCount - enabledCount;

  // Canonical config summary
  process.stderr.write("\n  Canonical config (.locus/mcp.json)\n");
  process.stderr.write(
    `    Servers: ${serverCount} total, ${enabledCount} enabled, ${disabledCount} disabled\n`
  );

  if (serverCount === 0) {
    process.stderr.write(
      "\n  No servers configured. Run locus mcp add <template> to get started.\n\n"
    );
    return;
  }

  // Check each provider
  const bridges: ProviderBridge[] = [
    new ClaudeBridge(),
    new CodexBridge("project"),
  ];

  let anyOutOfSync = false;

  process.stderr.write("\n  Provider status:\n");

  for (const bridge of bridges) {
    const configPath = join(projectRoot, bridge.configFileName);
    const fileExists = existsSync(configPath);

    // Get expected servers for this provider
    const expected = filterServersForProvider(servers, bridge.provider);
    const expectedNames = new Set(Object.keys(expected));

    process.stderr.write(`\n    ${bridge.provider}:\n`);
    process.stderr.write(
      `      Config: ${fileExists ? bridge.configFileName : "not found"}\n`
    );

    if (!fileExists) {
      if (expectedNames.size > 0) {
        process.stderr.write(
          "      Status: out of sync (config file missing)\n"
        );
        anyOutOfSync = true;
      } else {
        process.stderr.write(
          "      Status: ok (no servers target this provider)\n"
        );
      }
      continue;
    }

    // Read the provider's existing locus-managed servers
    const managedNames = await bridge.read(projectRoot);
    const actualNames = new Set(
      managedNames
        .map((n) => fromLocusName(n))
        .filter((n): n is string => n !== null)
    );

    // Compare expected vs actual
    const missing = [...expectedNames].filter((n) => !actualNames.has(n));
    const extra = [...actualNames].filter((n) => !expectedNames.has(n));

    if (missing.length === 0 && extra.length === 0) {
      process.stderr.write(
        `      Status: in sync (${expectedNames.size} server(s))\n`
      );
    } else {
      anyOutOfSync = true;
      process.stderr.write("      Status: out of sync\n");
      if (missing.length > 0) {
        process.stderr.write(`      Missing: ${missing.join(", ")}\n`);
      }
      if (extra.length > 0) {
        process.stderr.write(`      Extra: ${extra.join(", ")}\n`);
      }
    }
  }

  process.stderr.write("\n");

  if (anyOutOfSync) {
    process.stderr.write(
      "  Run locus mcp sync to synchronize provider configs.\n\n"
    );
  }
}
