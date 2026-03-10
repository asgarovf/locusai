/**
 * `locus mcp add <template>` — Add an MCP server from a built-in template.
 *
 * Looks up the template from the registry, prompts for required env vars,
 * tests the connection, saves to config, and syncs to providers.
 *
 * Flags:
 *   --name <name>           Override server name
 *   --providers <list>      Comma-separated provider list (default: all)
 *   --env KEY=VALUE         Set env var non-interactively (repeatable)
 *   --no-test               Skip connection testing
 *   --no-sync               Skip provider sync
 */

import { createInterface } from "node:readline";
import { syncAll } from "../bridges/sync.js";
import { McpTestClient } from "../client/test-client.js";
import { McpConfigStore } from "../config/store.js";
import {
  getTemplate,
  listTemplates,
  resolveTemplate,
} from "../registry/templates.js";

// ─── Arg parsing ────────────────────────────────────────────────────────────

interface AddFlags {
  name?: string;
  providers?: string[];
  env: Record<string, string>;
  noTest?: boolean;
  noSync?: boolean;
}

function parseAddArgs(args: string[]): { template: string; flags: AddFlags } {
  const flags: AddFlags = { env: {} };
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--name":
        flags.name = args[++i];
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
      default:
        positional.push(arg);
    }
    i++;
  }

  return { template: positional[0] ?? "", flags };
}

// ─── Interactive prompt ─────────────────────────────────────────────────────

function promptUser(question: string, sensitive = false): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise<string>((resolve) => {
    if (sensitive && process.stdin.isTTY) {
      // Write question without newline, then disable echo
      process.stderr.write(question);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      let value = "";
      const onData = (chunk: Buffer) => {
        const char = chunk.toString();
        if (char === "\n" || char === "\r") {
          process.stderr.write("\n");
          if (process.stdin.setRawMode) {
            process.stdin.setRawMode(false);
          }
          process.stdin.removeListener("data", onData);
          rl.close();
          resolve(value);
        } else if (char === "\u007f" || char === "\b") {
          // backspace
          value = value.slice(0, -1);
        } else if (char === "\u0003") {
          // Ctrl+C
          rl.close();
          process.exit(1);
        } else {
          value += char;
          process.stderr.write("*");
        }
      };
      process.stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

// ─── Command ────────────────────────────────────────────────────────────────

export async function addCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const { template: templateName, flags } = parseAddArgs(args);

  if (!templateName) {
    const available = listTemplates()
      .map((t) => t.name)
      .join(", ");
    process.stderr.write(
      "\n  Missing template name.\n\n" +
        "  Usage:\n" +
        "    locus mcp add <template>\n\n" +
        `  Available templates: ${available}\n\n` +
        "  For custom servers, use:\n" +
        "    locus mcp add-custom\n\n"
    );
    process.exit(1);
  }

  const template = getTemplate(templateName);
  if (!template) {
    const available = listTemplates()
      .map((t) => `    ${t.name.padEnd(14)} ${t.description}`)
      .join("\n");
    process.stderr.write(
      `\n  Unknown template: "${templateName}"\n\n` +
        "  Available templates:\n" +
        `${available}\n\n` +
        "  For custom servers, use:\n" +
        "    locus mcp add-custom\n\n"
    );
    process.exit(1);
  }

  const serverName = flags.name ?? template.name;

  // Check if already exists
  const store = new McpConfigStore(projectRoot);
  if (store.getServer(serverName)) {
    process.stderr.write(
      `\n  Server "${serverName}" already exists.\n` +
        "  Use a different --name or remove the existing one first.\n\n"
    );
    process.exit(1);
  }

  process.stderr.write(`\n  Adding ${template.displayName} MCP server...\n\n`);

  // Gather env vars
  const userInputs: Record<string, string> = { ...flags.env };

  for (const envPrompt of template.envPrompts) {
    if (userInputs[envPrompt.key]) continue; // Already provided via --env

    if (!process.stdin.isTTY) {
      if (envPrompt.required && !envPrompt.default) {
        process.stderr.write(
          `  Missing required env var: ${envPrompt.key}\n` +
            `  Provide it with: --env ${envPrompt.key}=<value>\n\n`
        );
        process.exit(1);
      }
      continue;
    }

    const defaultHint = envPrompt.default
      ? ` (default: ${envPrompt.default})`
      : "";
    const requiredHint = envPrompt.required ? " [required]" : "";
    const value = await promptUser(
      `  ${envPrompt.description}${defaultHint}${requiredHint}\n  ${envPrompt.key}: `,
      envPrompt.sensitive ?? false
    );

    if (value) {
      userInputs[envPrompt.key] = value;
    } else if (envPrompt.default) {
      userInputs[envPrompt.key] = envPrompt.default;
    } else if (envPrompt.required) {
      process.stderr.write(`\n  ${envPrompt.key} is required. Aborting.\n\n`);
      process.exit(1);
    }
  }

  // Resolve template to config
  const serverConfig = resolveTemplate(template, userInputs);

  // Set metadata
  serverConfig.metadata = {
    ...serverConfig.metadata,
    template: template.name,
  };
  if (flags.providers) {
    serverConfig.metadata.providers = flags.providers;
  }

  // Override display name to use the server name key
  serverConfig.name = serverName;

  // Test connection
  let toolNames: string[] = [];
  if (!flags.noTest) {
    process.stderr.write("  Testing connection...\n");
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

  // Save to config
  store.addServer(serverName, serverConfig);
  process.stderr.write(`  Saved to .locus/mcp.json\n`);

  // Sync to providers
  if (!flags.noSync) {
    const config = store.load();
    const results = await syncAll(projectRoot, config.servers);
    for (const result of results) {
      if (result.changed) {
        process.stderr.write(
          `  Synced to ${result.provider} (${result.serversWritten} server(s))\n`
        );
      }
      for (const error of results.flatMap((r) => r.errors)) {
        process.stderr.write(`  Warning: ${error}\n`);
      }
    }
  }

  // Summary
  process.stderr.write(`\n  Server "${serverName}" added successfully.\n`);
  if (toolNames.length > 0) {
    process.stderr.write(`  Tools: ${toolNames.join(", ")}\n`);
  }
  process.stderr.write("\n");
}
