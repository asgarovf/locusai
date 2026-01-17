import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, error, success } from "../api.js";

export function registerArtifactTools(server: McpServer): void {
  server.registerTool(
    "artifacts.list",
    {
      title: "List Artifacts",
      description:
        "List all artifacts for a task (including implementation drafts)",
      inputSchema: { taskId: z.number() },
    },
    async ({ taskId }) => {
      try {
        const data = await apiGet(`/artifacts?taskId=${taskId}`);
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );

  server.registerTool(
    "artifacts.get",
    {
      title: "Get Artifact",
      description: "Get the content of a specific artifact by ID",
      inputSchema: { artifactId: z.number() },
    },
    async ({ artifactId }) => {
      try {
        const data = await apiGet(`/artifacts/${artifactId}`);
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );
}
