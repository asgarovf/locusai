import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost, error, success } from "../api.js";

export function registerCiTools(server: McpServer): void {
  server.registerTool(
    "ci.run",
    {
      title: "Run CI",
      description: "Run a CI preset (e.g., 'quick' or 'full') for a task",
      inputSchema: {
        taskId: z.number(),
        preset: z.string(),
      },
    },
    async ({ taskId, preset }) => {
      try {
        const { data } = await apiPost("/ci/run", { taskId, preset });
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );
}
