/**
 * `locus mcp test <name>` — Test an MCP server connection.
 *
 * Looks up the server config by name, connects via McpTestClient,
 * discovers tools, measures response time, and displays results
 * in a formatted table.
 */

import { McpTestClient } from "../client/test-client.js";
import { McpConfigStore } from "../config/store.js";

// ─── Command ────────────────────────────────────────────────────────────────

export async function testCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const name = args[0];

  if (!name) {
    process.stderr.write(
      "\n  Missing server name.\n\n" +
        "  Usage:\n" +
        "    locus mcp test <name>\n\n" +
        "  Run locus mcp list to see configured servers.\n\n"
    );
    process.exit(1);
  }

  const store = new McpConfigStore(projectRoot);
  const serverConfig = store.getServer(name);

  if (!serverConfig) {
    process.stderr.write(
      `\n  Server "${name}" not found.\n\n` +
        "  Run locus mcp list to see configured servers.\n\n"
    );
    process.exit(1);
  }

  // Display server info
  process.stderr.write("\n");
  process.stderr.write(`  Server:     ${name}\n`);
  process.stderr.write(`  Transport:  ${serverConfig.transport}\n`);

  if (serverConfig.transport === "stdio") {
    process.stderr.write(
      `  Command:    ${serverConfig.command} ${serverConfig.args.join(" ")}\n`
    );
  } else if (serverConfig.transport === "http") {
    process.stderr.write(`  URL:        ${serverConfig.url}\n`);
  }

  process.stderr.write(
    `  Status:     ${serverConfig.enabled ? "enabled" : "disabled"}\n`
  );
  process.stderr.write("\n  Connecting...\n");

  const client = new McpTestClient({ timeoutMs: 15_000 });
  const start = Date.now();

  try {
    await client.connect(serverConfig);
    const connectMs = Date.now() - start;

    process.stderr.write(`  Connected (${connectMs}ms)\n`);
    process.stderr.write("  Discovering tools...\n\n");

    const { tools } = await client.listTools();
    const totalMs = Date.now() - start;

    if (tools.length === 0) {
      process.stderr.write("  No tools discovered.\n\n");
    } else {
      // Format tools as a table
      const nameWidth = Math.max(6, ...tools.map((t) => t.name.length));
      const descWidth = Math.max(
        12,
        ...tools.map((t) => (t.description ?? "").length)
      );
      const cappedDescWidth = Math.min(descWidth, 60);

      const pad = (str: string, width: number) =>
        str + " ".repeat(Math.max(0, width - str.length));

      process.stderr.write(`  ${pad("TOOL", nameWidth)}  DESCRIPTION\n`);
      process.stderr.write(
        `  ${"\u2500".repeat(nameWidth)}  ${"\u2500".repeat(cappedDescWidth)}\n`
      );

      for (const tool of tools) {
        const desc = tool.description ?? "-";
        const truncated =
          desc.length > cappedDescWidth
            ? `${desc.slice(0, cappedDescWidth - 3)}...`
            : desc;
        process.stderr.write(`  ${pad(tool.name, nameWidth)}  ${truncated}\n`);
      }
    }

    process.stderr.write(
      `\n  ${tools.length} tool(s) discovered in ${totalMs}ms\n`
    );
    process.stderr.write("  Connection: OK\n\n");
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);

    process.stderr.write(`\n  Connection failed after ${elapsed}ms\n`);
    process.stderr.write(`  Error: ${msg}\n\n`);

    // Provide actionable hints based on error type
    if (msg.includes("ECONNREFUSED")) {
      process.stderr.write(
        "  Hint: The server is not running or refused the connection.\n\n"
      );
    } else if (msg.includes("ENOTFOUND")) {
      process.stderr.write(
        "  Hint: The hostname could not be resolved. Check the URL.\n\n"
      );
    } else if (msg.includes("timed out")) {
      process.stderr.write(
        "  Hint: The server took too long to respond. It may be offline or overloaded.\n\n"
      );
    } else if (msg.includes("ENOENT") || msg.includes("spawn")) {
      process.stderr.write(
        "  Hint: The command was not found. Ensure it is installed and on PATH.\n\n"
      );
    }

    process.exit(1);
  } finally {
    await client.disconnect();
  }
}
