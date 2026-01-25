import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";

import { registerTools } from "./tools/definitions.js";

async function main() {
  const isStdio =
    process.env.TRANSPORT === "stdio" || process.argv.includes("--stdio");

  // If running in STDIO mode (e.g. local CLI usage)
  if (isStdio) {
    const server = new McpServer({
      name: "locus-agent-mcp",
      version: "0.1.0",
    });

    // Register tools (will rely on process.env for config fallback)
    registerTools(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Locus MCP Agent Server running on stdio");
    return;
  }

  // HTTP/SSE Mode
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Map to store active transports by session ID
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  // Unified MCP Endpoint
  app.all("/mcp", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    let transport = sessionId ? sessions.get(sessionId) : undefined;

    if (!transport) {
      if (sessionId) {
        // Client sent an ID but we don't have it (expired/invalid)
        res.status(404).json({
          error: "Not Found",
          message: "Session not found",
        });
        return;
      }

      // New connection (Initial SSE request)
      // Create a new Transport + Server pair for this session
      transport = new StreamableHTTPServerTransport();

      const server = new McpServer({
        name: "locus-agent-mcp",
        version: "0.1.0",
      });

      // Pass headers to tool registration context
      registerTools(server, { headers: req.headers });

      await server.connect(transport);

      // Store the transport if it has a session ID (stateful mode)
      if (transport.sessionId) {
        sessions.set(transport.sessionId, transport);

        transport.onclose = () => {
          if (transport?.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };
      }
    }

    // Delegate request handling to the transport
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error("Transport error:", e);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred during request handling",
        });
      }
    }
  });

  // Default handler for all other routes
  app.use((req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  app.listen(port, () => {
    console.log(`Locus MCP Server listening on port ${port}`);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
