/**
 * `locus mcp` — MCP server management command.
 *
 * Routes subcommands to the @locusai/locus-mcp package:
 *   add <template>    Add a server from a built-in template
 *   add-custom        Add a custom MCP server
 *   remove <name>     Remove an MCP server
 *   list              List configured servers
 *   sync              Sync config to provider-specific formats
 *   test <name>       Test an MCP server connection
 *   status            Show config and provider sync status
 *   enable <name>     Enable a server
 *   disable <name>    Disable a server
 */

import {
  addCommand,
  addCustomCommand,
  disableCommand,
  enableCommand,
  handleCommandError,
  listCommand,
  removeCommand,
  statusCommand,
  syncCommand,
  testCommand,
} from "@locusai/locus-mcp";

export async function mcpCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const subcommand = args[0] ?? "help";
  const subArgs = args.slice(1);

  try {
    switch (subcommand) {
      case "add":
        await addCommand(projectRoot, subArgs);
        break;
      case "add-custom":
        await addCustomCommand(projectRoot, subArgs);
        break;
      case "remove":
        await removeCommand(projectRoot, subArgs);
        break;
      case "list":
        await listCommand(projectRoot, subArgs);
        break;
      case "sync":
        await syncCommand(projectRoot, subArgs);
        break;
      case "test":
        await testCommand(projectRoot, subArgs);
        break;
      case "status":
        await statusCommand(projectRoot, subArgs);
        break;
      case "enable":
        await enableCommand(projectRoot, subArgs);
        break;
      case "disable":
        await disableCommand(projectRoot, subArgs);
        break;
      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;
      default:
        process.stderr.write(`  Unknown mcp subcommand: ${subcommand}\n`);
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

`);
}
