/**
 * `locus mcp sync` — Force-sync canonical config to all provider configs.
 *
 * Reads `.locus/mcp.json` and writes provider-specific configs for Claude
 * and Codex. Supports `--provider` to sync only one, `--dry-run` to preview
 * changes, and `--force` to overwrite even if no changes are detected.
 */

import type { ProviderBridge } from "../types.js";
import { ClaudeBridge } from "../bridges/claude.js";
import { CodexBridge } from "../bridges/codex.js";
import type { ProviderName } from "../bridges/sync.js";
import { filterServersForProvider, syncProvider } from "../bridges/sync.js";
import { McpConfigStore } from "../config/store.js";

// ─── Arg parsing ────────────────────────────────────────────────────────────

interface SyncFlags {
  provider?: ProviderName;
  dryRun?: boolean;
  force?: boolean;
}

function parseSyncArgs(args: string[]): SyncFlags {
  const flags: SyncFlags = {};

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--provider":
        i++;
        if (args[i] === "claude" || args[i] === "codex") {
          flags.provider = args[i] as ProviderName;
        } else {
          process.stderr.write(
            `\n  Invalid provider: "${args[i]}". Must be "claude" or "codex".\n\n`
          );
          process.exit(1);
        }
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--force":
        flags.force = true;
        break;
    }
    i++;
  }

  return flags;
}

// ─── Command ────────────────────────────────────────────────────────────────

export async function syncCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const flags = parseSyncArgs(args);
  const store = new McpConfigStore(projectRoot);
  const config = store.load();
  const servers = config.servers;

  const serverCount = Object.keys(servers).length;
  const enabledCount = Object.values(servers).filter((s) => s.enabled).length;

  if (serverCount === 0) {
    process.stderr.write(
      "\n  No MCP servers configured. Nothing to sync.\n\n" +
        "  Add one with:\n" +
        "    locus mcp add <template>\n" +
        "    locus mcp add-custom\n\n"
    );
    return;
  }

  // Determine which bridges to sync
  const bridges: ProviderBridge[] = flags.provider
    ? [getBridgeForProvider(flags.provider)]
    : [new ClaudeBridge(), new CodexBridge("project")];

  if (flags.dryRun) {
    process.stderr.write("\n  Dry run — no files will be modified.\n\n");
    process.stderr.write(
      `  Canonical config: ${serverCount} server(s), ${enabledCount} enabled\n\n`
    );

    for (const bridge of bridges) {
      const filtered = filterServersForProvider(servers, bridge.provider);
      const filteredCount = Object.keys(filtered).length;
      const skipped = enabledCount - filteredCount;

      process.stderr.write(`  ${bridge.provider}:\n`);
      process.stderr.write(`    Target: ${bridge.configFileName}\n`);
      process.stderr.write(`    Would sync: ${filteredCount} server(s)\n`);
      if (skipped > 0) {
        process.stderr.write(
          `    Skipped: ${skipped} (not targeting this provider)\n`
        );
      }

      for (const [name, cfg] of Object.entries(filtered)) {
        process.stderr.write(`      • ${name} (${cfg.transport})\n`);
      }
    }

    process.stderr.write("\n");
    return;
  }

  // Perform the actual sync
  process.stderr.write("\n");

  const results = await Promise.all(
    bridges.map((bridge) => syncProvider(projectRoot, bridge, servers))
  );

  for (const result of results) {
    const status = result.changed
      ? "updated"
      : flags.force
        ? "forced (no changes)"
        : "no changes";
    process.stderr.write(
      `  ${result.provider}: ${result.serversWritten} server(s) synced (${status})\n`
    );
    process.stderr.write(`    → ${result.configPath}\n`);

    if (result.serversRemoved.length > 0) {
      process.stderr.write(
        `    Removed: ${result.serversRemoved.join(", ")}\n`
      );
    }

    for (const error of result.errors) {
      process.stderr.write(`    ⚠ ${error}\n`);
    }
  }

  process.stderr.write("\n");
}

function getBridgeForProvider(provider: ProviderName): ProviderBridge {
  switch (provider) {
    case "claude":
      return new ClaudeBridge();
    case "codex":
      return new CodexBridge("project");
  }
}
