/**
 * `locus mcp enable <name>` / `locus mcp disable <name>` — Toggle server enabled state.
 *
 * Sets or clears the `enabled` flag on a server in the canonical config
 * and triggers a sync to add or remove it from provider configs.
 */

import { syncAll } from "../bridges/sync.js";
import { McpConfigStore } from "../config/store.js";

// ─── Command ────────────────────────────────────────────────────────────────

export async function enableCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  await toggleCommand(projectRoot, args, true);
}

export async function disableCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  await toggleCommand(projectRoot, args, false);
}

async function toggleCommand(
  projectRoot: string,
  args: string[],
  enabled: boolean
): Promise<void> {
  const name = args[0];
  const action = enabled ? "enable" : "disable";

  if (!name) {
    process.stderr.write(
      `\n  Missing server name.\n\n` +
        `  Usage:\n` +
        `    locus mcp ${action} <name>\n\n` +
        "  Run locus mcp list to see configured servers.\n\n"
    );
    process.exit(1);
  }

  const store = new McpConfigStore(projectRoot);
  const server = store.getServer(name);

  if (!server) {
    process.stderr.write(
      `\n  Server "${name}" not found.\n\n` +
        "  Run locus mcp list to see configured servers.\n\n"
    );
    process.exit(1);
  }

  if (server.enabled === enabled) {
    process.stderr.write(
      `\n  Server "${name}" is already ${enabled ? "enabled" : "disabled"}.\n\n`
    );
    return;
  }

  store.toggleServer(name, enabled);
  process.stderr.write(
    `  ${enabled ? "Enabled" : "Disabled"} "${name}" in .locus/mcp.json\n`
  );

  // Re-sync to propagate the change to provider configs
  const config = store.load();
  const results = await syncAll(projectRoot, config.servers);

  for (const result of results) {
    if (enabled && result.serversWritten > 0) {
      process.stderr.write(`  Added to ${result.provider} config\n`);
    }
    if (!enabled && result.serversRemoved.length > 0) {
      process.stderr.write(
        `  Removed from ${result.provider}: ${result.serversRemoved.join(", ")}\n`
      );
    }
    for (const error of result.errors) {
      process.stderr.write(`  Warning (${result.provider}): ${error}\n`);
    }
  }

  process.stderr.write(
    `\n  Server "${name}" ${enabled ? "enabled" : "disabled"} successfully.\n\n`
  );
}
