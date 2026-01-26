import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AGENT_INSTRUCTIONS, ClientConfig } from "../lib/types.js";
import { SessionWorkflow } from "../workflows/session.workflow.js";

type ToolArgs = Record<string, unknown>;
type Headers = Record<string, string | string[] | undefined>;

// Helper to validate and extract config from various sources
function getClientConfig(args: ToolArgs, headers?: Headers): ClientConfig {
  // 1. Try Tool Arguments (if user passed them explicitly)
  let apiKey = typeof args?.apiKey === "string" ? args.apiKey : undefined;
  let workspaceId =
    typeof args?.workspaceId === "string" ? args.workspaceId : undefined;

  // 2. Try Headers (if passed via SSE/HTTP context)
  if (!apiKey && headers) {
    const rawApiKey = headers["x-api-key"] || headers["x-locus-api-key"];
    apiKey = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey;

    const rawWorkspace =
      headers["x-workspace-id"] || headers["x-locus-workspace-id"];
    workspaceId = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;
  }

  // 3. Fallback to Server Env (if running locally/single-tenant)
  if (!apiKey) apiKey = process.env.LOCUS_API_KEY;
  if (!workspaceId) workspaceId = process.env.LOCUS_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    throw new Error(
      "Missing configuration: apiKey and workspaceId are required. " +
        "Please provide them as arguments or configure the server."
    );
  }

  return { apiKey, workspaceId };
}

export function registerTools(
  server: McpServer,
  requestContext?: { headers?: Headers }
) {
  // Tool 1: Start Agent Session
  server.registerTool(
    "start_agent_session",
    {
      description:
        "Activates the Locus MCP Agent. Use this tool whenever the user asks to 'run locus', 'start locus mcp', 'start agent', or 'begin session'. This initializes the workflow and retrieves the first assigned task.",
      inputSchema: {
        apiKey: z
          .string()
          .optional()
          .describe("Locus API Key (optional if configured)"),
        workspaceId: z
          .string()
          .optional()
          .describe("Locus Workspace ID (optional if configured)"),
      },
    },
    async (args) => {
      const config = getClientConfig(args, requestContext?.headers);
      const workflow = new SessionWorkflow(config);

      const { sprint, task } = await workflow.start();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sprint,
                current_task: task,
                instructions: AGENT_INSTRUCTIONS,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool 2: Complete and Next
  server.registerTool(
    "complete_and_next",
    {
      description: "Complete the current task and get the next one.",
      inputSchema: {
        taskId: z.string(),
        summary: z.string(),
        artifacts: z.array(z.string()).optional(),
        // We accept auth params here too just in case state is lost/stateless
        apiKey: z.string().optional(),
        workspaceId: z.string().optional(),
      },
    },
    async (args) => {
      const config = getClientConfig(args, requestContext?.headers);
      const workflow = new SessionWorkflow(config);

      const { taskId, summary, artifacts } = args;
      const nextTask = await workflow.completeAndNext(
        taskId,
        summary,
        artifacts || []
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                completed: { taskId },
                next_task: nextTask,
                done: nextTask === null,
                instructions: nextTask
                  ? "Continue with the next task above."
                  : "All tasks completed. Session finished.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
