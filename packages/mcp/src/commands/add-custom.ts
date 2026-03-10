/**
 * `locus mcp add-custom` — Add a custom MCP server with manual configuration.
 *
 * Interactive prompts for: server name, transport type, command+args or URL,
 * env vars, and provider targets. All values can be set via flags for
 * non-interactive use.
 *
 * Flags:
 *   --name <name>            Server name
 *   --transport <type>       Transport: stdio, sse, streamable-http
 *   --command <cmd>          Command for stdio transport
 *   --args <args>            Space-separated args for stdio (quote if needed)
 *   --url <url>              URL for HTTP transports
 *   --providers <list>       Comma-separated provider list
 *   --env KEY=VALUE          Set env var (repeatable)
 *   --no-test                Skip connection testing
 *   --no-sync                Skip provider sync
 */

import { createInterface } from "node:readline";
import { McpConfigStore } from "../config/store.js";
import { McpTestClient } from "../client/test-client.js";
import { syncAll } from "../bridges/sync.js";
import type {
  McpHttpServerConfig,
  McpServerConfig,
  McpStdioServerConfig,
} from "../types.js";

// ─── Arg parsing ────────────────────────────────────────────────────────────

interface AddCustomFlags {
  name?: string;
  transport?: string;
  command?: string;
  args?: string;
  url?: string;
  providers?: string[];
  env: Record<string, string>;
  noTest?: boolean;
  noSync?: boolean;
}

function parseAddCustomArgs(args: string[]): AddCustomFlags {
  const flags: AddCustomFlags = { env: {} };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--name":
        flags.name = args[++i];
        break;
      case "--transport":
        flags.transport = args[++i];
        break;
      case "--command":
        flags.command = args[++i];
        break;
      case "--args":
        flags.args = args[++i];
        break;
      case "--url":
        flags.url = args[++i];
        break;
      case "--providers":
        flags.providers = (args[++i] ?? "").split(",").map((s) => s.trim());
        break;
      case "--env": {
        const pair = args[++i] ?? "";
        const eqIdx = pair.indexOf("=");
        if (eqIdx > 0) {
          flags.env[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
        }
        break;
      }
      case "--no-test":
        flags.noTest = true;
        break;
      case "--no-sync":
        flags.noSync = true;
        break;
    }
    i++;
  }

  return flags;
}

// ─── Interactive prompt ─────────────────────────────────────────────────────

function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Command ────────────────────────────────────────────────────────────────

export async function addCustomCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const flags = parseAddCustomArgs(args);
  const isInteractive = process.stdin.isTTY;

  // ── Server name ──
  let name = flags.name;
  if (!name) {
    if (!isInteractive) {
      process.stderr.write(
        "\n  Missing --name flag. Required for non-interactive use.\n\n"
      );
      process.exit(1);
    }
    name = await promptUser("  Server name: ");
    if (!name) {
      process.stderr.write("\n  Server name is required. Aborting.\n\n");
      process.exit(1);
    }
  }

  // Check if already exists
  const store = new McpConfigStore(projectRoot);
  if (store.getServer(name)) {
    process.stderr.write(
      `\n  Server "${name}" already exists.\n` +
        "  Use a different --name or remove the existing one first.\n\n"
    );
    process.exit(1);
  }

  // ── Transport type ──
  let transport = flags.transport;
  if (!transport) {
    if (!isInteractive) {
      process.stderr.write(
        "\n  Missing --transport flag. Required for non-interactive use.\n" +
          "  Options: stdio, sse, streamable-http\n\n"
      );
      process.exit(1);
    }
    transport = await promptUser(
      "  Transport type (stdio, sse, streamable-http) [stdio]: "
    );
    if (!transport) transport = "stdio";
  }

  // Normalize transport
  const isStdio = transport === "stdio";
  const isSSE = transport === "sse";
  const isStreamableHttp = transport === "streamable-http";

  if (!isStdio && !isSSE && !isStreamableHttp) {
    process.stderr.write(
      `\n  Invalid transport: "${transport}"\n` +
        "  Options: stdio, sse, streamable-http\n\n"
    );
    process.exit(1);
  }

  let serverConfig: McpServerConfig;

  if (isStdio) {
    // ── Stdio config ──
    let command = flags.command;
    if (!command) {
      if (!isInteractive) {
        process.stderr.write(
          "\n  Missing --command flag. Required for stdio transport.\n\n"
        );
        process.exit(1);
      }
      command = await promptUser("  Command (e.g. npx, node, python): ");
      if (!command) {
        process.stderr.write("\n  Command is required. Aborting.\n\n");
        process.exit(1);
      }
    }

    let cmdArgs: string[] = [];
    if (flags.args) {
      cmdArgs = flags.args.split(" ").filter(Boolean);
    } else if (isInteractive) {
      const argsStr = await promptUser("  Arguments (space-separated): ");
      cmdArgs = argsStr.split(" ").filter(Boolean);
    }

    serverConfig = {
      transport: "stdio",
      name,
      enabled: true,
      command,
      args: cmdArgs,
      ...(Object.keys(flags.env).length > 0 ? { env: flags.env } : {}),
    } as McpStdioServerConfig;
  } else {
    // ── HTTP config (SSE or streamable-http) ──
    let url = flags.url;
    if (!url) {
      if (!isInteractive) {
        process.stderr.write(
          "\n  Missing --url flag. Required for HTTP transport.\n\n"
        );
        process.exit(1);
      }
      url = await promptUser("  Server URL: ");
      if (!url) {
        process.stderr.write("\n  URL is required. Aborting.\n\n");
        process.exit(1);
      }
    }

    serverConfig = {
      transport: "http",
      name,
      enabled: true,
      url,
      ...(Object.keys(flags.env).length > 0 ? { env: flags.env } : {}),
      metadata: isSSE ? { transport: "sse" } : {},
    } as McpHttpServerConfig;
  }

  // ── Providers ──
  if (flags.providers) {
    serverConfig.metadata = {
      ...serverConfig.metadata,
      providers: flags.providers,
    };
  } else if (isInteractive) {
    const providersStr = await promptUser(
      "  Provider targets (claude,codex) [all]: "
    );
    if (providersStr) {
      serverConfig.metadata = {
        ...serverConfig.metadata,
        providers: providersStr.split(",").map((s) => s.trim()),
      };
    }
  }

  // ── Env vars (interactive) ──
  if (isInteractive && Object.keys(flags.env).length === 0) {
    let addMore = true;
    while (addMore) {
      const envInput = await promptUser(
        "  Add env var (KEY=VALUE, or press Enter to skip): "
      );
      if (!envInput) {
        addMore = false;
      } else {
        const eqIdx = envInput.indexOf("=");
        if (eqIdx > 0) {
          if (!serverConfig.env) serverConfig.env = {};
          serverConfig.env[envInput.slice(0, eqIdx)] = envInput.slice(
            eqIdx + 1
          );
        }
      }
    }
  }

  // ── Test connection ──
  let toolNames: string[] = [];
  if (!flags.noTest) {
    process.stderr.write("\n  Testing connection...\n");
    const client = new McpTestClient({ timeoutMs: 15_000 });
    try {
      await client.connect(serverConfig);
      const result = await client.listTools();
      toolNames = result.tools.map((t) => t.name);
      await client.disconnect();
      process.stderr.write(
        `  Connected successfully. Found ${toolNames.length} tool(s).\n`
      );
    } catch (err) {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort cleanup
      await client.disconnect().catch(() => {});
      process.stderr.write(
        `  Connection test failed: ${err instanceof Error ? err.message : String(err)}\n` +
          "  Use --no-test to skip testing.\n\n"
      );
      process.exit(1);
    }
  }

  // ── Save to config ──
  store.addServer(name, serverConfig);
  process.stderr.write(`  Saved to .locus/mcp.json\n`);

  // ── Sync to providers ──
  if (!flags.noSync) {
    const config = store.load();
    const results = await syncAll(projectRoot, config.servers);
    for (const result of results) {
      if (result.changed) {
        process.stderr.write(
          `  Synced to ${result.provider} (${result.serversWritten} server(s))\n`
        );
      }
      for (const error of result.errors) {
        process.stderr.write(`  Warning: ${error}\n`);
      }
    }
  }

  // ── Summary ──
  process.stderr.write(`\n  Server "${name}" added successfully.\n`);
  if (toolNames.length > 0) {
    process.stderr.write(`  Tools: ${toolNames.join(", ")}\n`);
  }
  process.stderr.write("\n");
}
