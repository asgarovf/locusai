/**
 * Main entry point for locus-mcp.
 *
 * Dispatches subcommands for MCP server management:
 *   - init: Create a default .locus/mcp.json config
 *   - add: Add an MCP server to the config
 *   - remove: Remove an MCP server from the config
 *   - list: List configured MCP servers
 *   - sync: Sync config to provider-specific formats
 *   - health: Health-check configured servers
 *
 * Usage:
 *   locus pkg mcp init              → Create default config
 *   locus pkg mcp add <name>        → Add a server
 *   locus pkg mcp list              → List servers
 *   locus pkg mcp sync              → Sync to providers
 */

import { handleCommandError } from "./errors.js";

export {
  fromLocusName,
  isLocusManaged,
  LOCUS_SERVER_PREFIX,
  toLocusName,
} from "./bridges/bridge.js";
export { ClaudeBridge } from "./bridges/claude.js";
export { CodexBridge } from "./bridges/codex.js";
export type { ProviderName } from "./bridges/sync.js";
export {
  filterServersForProvider,
  getBridge,
  printSyncResults,
  syncAll,
  syncProvider,
} from "./bridges/sync.js";
export type {
  CallToolResult,
  ListToolsResult,
  McpTestClientOptions,
} from "./client/test-client.js";
export { McpTestClient } from "./client/test-client.js";
// Re-export command handlers for use by locus CLI
export { addCommand } from "./commands/add.js";
export { addCustomCommand } from "./commands/add-custom.js";
export { listCommand } from "./commands/list.js";
export { removeCommand } from "./commands/remove.js";
export { statusCommand } from "./commands/status.js";
export { syncCommand } from "./commands/sync.js";
export { testCommand } from "./commands/test.js";
export { disableCommand, enableCommand } from "./commands/toggle.js";
export {
  McpConfigSchema,
  McpHttpServerSchema,
  McpServerConfigSchema,
  McpStdioServerSchema,
} from "./config/schema.js";
export type { McpConfig } from "./config/store.js";
export { McpConfigStore } from "./config/store.js";
export {
  handleCommandError,
  McpConfigError,
  McpProviderError,
  McpServerError,
} from "./errors.js";
export type { HealthCheckOptions } from "./lifecycle/health.js";
export {
  checkAllServersHealth,
  checkServerHealth,
} from "./lifecycle/health.js";
export {
  getTemplate,
  listTemplates,
  resolveTemplate,
} from "./registry/templates.js";
// Re-export public API
export type {
  EnvPrompt,
  HealthCheckResult,
  McpHttpServerConfig,
  McpServerConfig,
  McpServerConfigBase,
  McpServerTemplate,
  McpStdioServerConfig,
  McpTool,
  ProviderBridge,
  ServerProcess,
  SyncResult,
} from "./types.js";

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";
  const subArgs = args.slice(1);

  // Determine project root (cwd by default)
  const projectRoot = process.cwd();

  try {
    switch (command) {
      case "add": {
        const { addCommand: add } = await import("./commands/add.js");
        await add(projectRoot, subArgs);
        break;
      }
      case "add-custom": {
        const { addCustomCommand: addCustom } = await import(
          "./commands/add-custom.js"
        );
        await addCustom(projectRoot, subArgs);
        break;
      }
      case "remove": {
        const { removeCommand: remove } = await import("./commands/remove.js");
        await remove(projectRoot, subArgs);
        break;
      }
      case "list": {
        const { listCommand: list } = await import("./commands/list.js");
        await list(projectRoot, subArgs);
        break;
      }
      case "sync": {
        const { syncCommand: sync } = await import("./commands/sync.js");
        await sync(projectRoot, subArgs);
        break;
      }
      case "test": {
        const { testCommand: test } = await import("./commands/test.js");
        await test(projectRoot, subArgs);
        break;
      }
      case "status": {
        const { statusCommand: status } = await import("./commands/status.js");
        await status(projectRoot, subArgs);
        break;
      }
      case "enable": {
        const { enableCommand: enable } = await import("./commands/toggle.js");
        await enable(projectRoot, subArgs);
        break;
      }
      case "disable": {
        const { disableCommand: disable } = await import(
          "./commands/toggle.js"
        );
        await disable(projectRoot, subArgs);
        break;
      }
      case "help":
      case "--help":
      case "-h":
        return printHelp();
      default:
        process.stderr.write(`  Unknown command: ${command}\n`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    handleCommandError(err);
  }
}

function printHelp(): void {
  process.stderr.write(`
  locus mcp — Multi-provider MCP server management

  Usage:
    locus mcp <command> [options]

  Commands:
    add <template>                Add a server from a built-in template
    add-custom                    Add a custom MCP server
    remove <name>                 Remove an MCP server
    list                          List configured servers
    sync                          Sync config to provider-specific formats
    test <name>                   Test an MCP server connection
    status                        Show config and provider sync status
    enable <name>                 Enable a server
    disable <name>                Disable a server

  Options:
    --help, -h                    Show this help

  Examples:
    locus mcp add github
    locus mcp add postgres --name mydb --env POSTGRES_CONNECTION=postgresql://...
    locus mcp add-custom --name api --transport stdio --command node --args server.js
    locus mcp remove mydb
    locus mcp list
    locus mcp list --json
    locus mcp sync --dry-run
    locus mcp sync --provider claude
    locus mcp test mydb
    locus mcp status
    locus mcp disable mydb
    locus mcp enable mydb
\n`);
}
