/**
 * `locus mcp remove <name>` — Remove a server from config and provider configs.
 *
 * Removes the server from `.locus/mcp.json` and triggers a sync to remove
 * the corresponding `locus-<name>` entries from provider configs.
 */

import { syncAll } from "../bridges/sync.js";
import { McpConfigStore } from "../config/store.js";

// ─── Command ────────────────────────────────────────────────────────────────

export async function removeCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const name = args[0];

  if (!name) {
    process.stderr.write(
      "\n  Missing server name.\n\n" +
        "  Usage:\n" +
        "    locus mcp remove <name>\n\n" +
        "  Run locus mcp list to see configured servers.\n\n"
    );
    process.exit(1);
  }

  const store = new McpConfigStore(projectRoot);
  const existed = store.removeServer(name);

  if (!existed) {
    process.stderr.write(
      `\n  Server "${name}" not found.\n\n` +
        "  Run locus mcp list to see configured servers.\n\n"
    );
    process.exit(1);
  }

  process.stderr.write(`  Removed "${name}" from .locus/mcp.json\n`);

  // Re-sync to remove locus-<name> from provider configs
  const config = store.load();
  const results = await syncAll(projectRoot, config.servers);

  for (const result of results) {
    if (result.serversRemoved.length > 0) {
      process.stderr.write(
        `  Removed from ${result.provider}: ${result.serversRemoved.join(", ")}\n`
      );
    }
    for (const error of result.errors) {
      process.stderr.write(`  Warning (${result.provider}): ${error}\n`);
    }
  }

  process.stderr.write(`\n  Server "${name}" removed successfully.\n\n`);
}
