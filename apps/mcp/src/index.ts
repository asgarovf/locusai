#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import config to trigger CLI arg parsing
import "./config.js";

// Import tool registration functions
import { registerAgentTools } from "./tools/agents.js";
import { registerCiTools } from "./tools/ci.js";
import { registerDocsTools } from "./tools/docs.js";
import { registerKanbanTools } from "./tools/kanban.js";

// Create server instance
const server = new McpServer({
  name: "locus",
  version: "0.1.0",
});

// Register all tools
registerAgentTools(server);
registerDocsTools(server);
registerKanbanTools(server);
registerCiTools(server);

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Locus MCP server running on stdio");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
