/**
 * `locus mcp list` — Display all configured MCP servers.
 *
 * Shows a formatted table with server name, template, transport, providers,
 * and enabled/disabled status. Supports `--json` for machine-readable output.
 */

import { McpConfigStore } from "../config/store.js";

// ─── Arg parsing ────────────────────────────────────────────────────────────

interface ListFlags {
  json?: boolean;
}

function parseListArgs(args: string[]): ListFlags {
  const flags: ListFlags = {};

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--json":
        flags.json = true;
        break;
    }
    i++;
  }

  return flags;
}

// ─── Command ────────────────────────────────────────────────────────────────

export async function listCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const flags = parseListArgs(args);
  const store = new McpConfigStore(projectRoot);
  const servers = store.listServers();

  if (flags.json) {
    const output = {
      servers: servers.map(({ name, config }) => ({
        name,
        transport: config.transport,
        enabled: config.enabled,
        ...(config.metadata?.template
          ? { template: config.metadata.template }
          : {}),
        ...(config.metadata?.providers
          ? { providers: config.metadata.providers }
          : {}),
      })),
      total: servers.length,
      enabled: servers.filter((s) => s.config.enabled).length,
    };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }

  if (servers.length === 0) {
    process.stderr.write(
      "\n  No MCP servers configured.\n\n" +
        "  Add one with:\n" +
        "    locus mcp add <template>       (e.g. github, postgres)\n" +
        "    locus mcp add-custom           (manual configuration)\n\n"
    );
    return;
  }

  // Table header
  const nameWidth = Math.max(6, ...servers.map((s) => s.name.length));
  const transportWidth = 10;
  const statusWidth = 10;
  const providersWidth = 16;
  const templateWidth = 12;

  const pad = (str: string, width: number) =>
    str + " ".repeat(Math.max(0, width - str.length));

  process.stderr.write("\n");
  process.stderr.write(
    `  ${pad("NAME", nameWidth)}  ${pad("TEMPLATE", templateWidth)}  ${pad("TRANSPORT", transportWidth)}  ${pad("PROVIDERS", providersWidth)}  ${pad("STATUS", statusWidth)}\n`
  );
  process.stderr.write(
    `  ${"\u2500".repeat(nameWidth)}  ${"\u2500".repeat(templateWidth)}  ${"\u2500".repeat(transportWidth)}  ${"\u2500".repeat(providersWidth)}  ${"\u2500".repeat(statusWidth)}\n`
  );

  for (const { name, config } of servers) {
    const template = (config.metadata?.template as string) ?? "-";
    const transport = config.transport;
    const providers = Array.isArray(config.metadata?.providers)
      ? (config.metadata.providers as string[]).join(", ")
      : "all";
    const status = config.enabled ? "enabled" : "disabled";

    process.stderr.write(
      `  ${pad(name, nameWidth)}  ${pad(template, templateWidth)}  ${pad(transport, transportWidth)}  ${pad(providers, providersWidth)}  ${pad(status, statusWidth)}\n`
    );
  }

  // Summary
  const enabled = servers.filter((s) => s.config.enabled).length;
  process.stderr.write(
    `\n  ${servers.length} server(s) configured, ${enabled} enabled\n\n`
  );
}
