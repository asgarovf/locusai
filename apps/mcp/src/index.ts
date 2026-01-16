import { parseArgs } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    project: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.project) {
  console.error("Usage: bun run mcp -- --project <workspaceDir>");
  process.exit(1);
}

const API_BASE = "http://localhost:3000/api";

const server = new Server(
  {
    name: "locus",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "docs.tree",
        description: "Get documentation tree",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "docs.read",
        description: "Read a document",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
      {
        name: "docs.write",
        description: "Write a document",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" }, content: { type: "string" } },
          required: ["path", "content"],
        },
      },
      {
        name: "kanban.list",
        description: "List tasks",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "kanban.get",
        description: "Get task details",
        inputSchema: {
          type: "object",
          properties: { taskId: { type: "number" } },
          required: ["taskId"],
        },
      },
      {
        name: "kanban.create",
        description: "Create a task",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title"],
        },
      },
      {
        name: "kanban.move",
        description: "Move task status",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "number" },
            status: { type: "string" },
          },
          required: ["taskId", "status"],
        },
      },
      {
        name: "kanban.comment",
        description: "Add comment to task",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "number" },
            author: { type: "string" },
            text: { type: "string" },
          },
          required: ["taskId", "author", "text"],
        },
      },
      {
        name: "ci.run",
        description: "Run CI preset",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "number" },
            preset: { type: "string" },
          },
          required: ["taskId", "preset"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "docs.tree": {
        const res = await fetch(`${API_BASE}/docs/tree`);
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      case "docs.read": {
        const res = await fetch(
          `${API_BASE}/docs/read?path=${encodeURIComponent(args?.path as string)}`
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      case "docs.write": {
        const res = await fetch(`${API_BASE}/docs/write`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      case "kanban.list": {
        const res = await fetch(`${API_BASE}/tasks`);
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      case "kanban.get": {
        const res = await fetch(`${API_BASE}/tasks/${args?.taskId}`);
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      case "kanban.create": {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      case "kanban.move": {
        const res = await fetch(`${API_BASE}/tasks/${args?.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: args?.status }),
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      case "ci.run": {
        const res = await fetch(`${API_BASE}/ci/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        return {
          content: [
            { type: "text", text: JSON.stringify(await res.json(), null, 2) },
          ],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Locus MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
