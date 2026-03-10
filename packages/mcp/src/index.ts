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
export {
  getTemplate,
  listTemplates,
  resolveTemplate,
} from "./registry/templates.js";

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  try {
    switch (command) {
      case "help":
      case "--help":
      case "-h":
        return printHelp();
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    handleCommandError(err);
  }
}

function printHelp(): void {
  console.log(`
  locus-mcp — Multi-provider MCP server management for Locus

  Usage:
    locus pkg mcp <command>

  Commands:
    init                          Create default .locus/mcp.json config
    add <name>                    Add an MCP server
    remove <name>                 Remove an MCP server
    list                          List configured servers
    enable <name>                 Enable a server
    disable <name>                Disable a server
    sync                          Sync config to provider-specific formats
    health                        Health-check all configured servers

  Examples:
    locus pkg mcp init
    locus pkg mcp add github --transport stdio --command npx --args @modelcontextprotocol/server-github
    locus pkg mcp list
    locus pkg mcp sync
    locus pkg mcp health
  `);
}
