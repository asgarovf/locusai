import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost, error, success } from "../api.js";

export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    "docs.tree",
    {
      title: "Documentation Tree",
      description: "Get the documentation tree structure",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await apiGet("/docs/tree");
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );

  server.registerTool(
    "docs.read",
    {
      title: "Read Document",
      description: "Read a document from the documentation",
      inputSchema: { path: z.string() },
    },
    async ({ path }) => {
      try {
        const data = await apiGet(
          `/docs/read?path=${encodeURIComponent(path)}`
        );
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );

  server.registerTool(
    "docs.write",
    {
      title: "Write Document",
      description: "Write content to a document",
      inputSchema: {
        path: z.string(),
        content: z.string(),
      },
    },
    async ({ path, content }) => {
      try {
        const { data } = await apiPost("/docs/write", { path, content });
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );
}
