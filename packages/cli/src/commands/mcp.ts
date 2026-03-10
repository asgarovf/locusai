/**
 * `locus mcp` — MCP server management command.
 *
 * Routes subcommands to the @locusai/locus-mcp package:
 *   add <template>    Add a server from a built-in template
 *   add-custom        Add a custom MCP server
 *   remove <name>     Remove an MCP server
 *   list              List configured servers
 */

import {
  addCommand,
  addCustomCommand,
  handleCommandError,
  listCommand,
  removeCommand,
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

  Examples:
    locus mcp add github
    locus mcp add postgres --name mydb --env POSTGRES_CONNECTION=postgresql://...
    locus mcp add-custom --name api --transport stdio --command node --args server.js
    locus mcp remove mydb
    locus mcp list
    locus mcp list --json

`);
}
