import { LocusClient } from "@locusai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AGENT_INSTRUCTIONS, ClientConfig } from "../lib/types.js";
import { SessionWorkflow } from "../workflows/session.workflow.js";

type ToolArgs = Record<string, unknown>;
type Headers = Record<string, string | string[] | undefined>;

// Helper to validate and extract config from various sources
async function resolveClientConfig(
  args: ToolArgs,
  headers?: Headers
): Promise<ClientConfig> {
  // 1. Try Tool Arguments (if user passed them explicitly)
  let apiKey = typeof args?.apiKey === "string" ? args.apiKey : undefined;
  let workspaceId =
    typeof args?.workspaceId === "string" ? args.workspaceId : undefined;

  // 2. Try Headers (if passed via SSE/HTTP context)
  if (!apiKey && headers) {
    const rawApiKey = headers["x-api-key"] || headers["x-locus-api-key"];
    apiKey = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey;
  }

  if (!workspaceId && headers) {
    const rawWorkspace =
      headers["x-workspace-id"] || headers["x-locus-workspace-id"];
    workspaceId = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;
  }

  if (!apiKey) {
    throw new Error(
      "Missing configuration: apiKey is required. " +
        "Please provide it as an argument or configure the server."
    );
  }

  // 3. Resolve Workspace ID from API Key if missing
  if (!workspaceId) {
    try {
      const client = new LocusClient({
        baseUrl:
          (process.env.API_URL as string) || "https://api.locusai.dev/api",
        token: apiKey,
      });

      const info = await client.auth.getApiKeyInfo();

      if (info.workspaceId) {
        workspaceId = info.workspaceId;
      } else {
        throw new Error("API key is not associated with a workspace.");
      }
    } catch (error) {
      throw new Error(
        `Failed to resolve workspace from API key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
        projectPath: z
          .string()
          .optional()
          .describe("Absolute path to the project root (defaults to cwd)"),
      },
    },
    async (args) => {
      const config = await resolveClientConfig(args, requestContext?.headers);
      const projectPath =
        typeof args.projectPath === "string" ? args.projectPath : undefined;
      const workflow = new SessionWorkflow(config, projectPath);

      const { sprint, task, instructions } = await workflow.start();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sprint,
                current_task: task,
                instructions: instructions || AGENT_INSTRUCTIONS,
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
        projectPath: z.string().optional(),
      },
    },
    async (args) => {
      const config = await resolveClientConfig(args, requestContext?.headers);
      const projectPath =
        typeof args.projectPath === "string" ? args.projectPath : undefined;
      const workflow = new SessionWorkflow(config, projectPath);

      const { taskId, summary, artifacts } = args;
      const { task: nextTask, instructions } = await workflow.completeAndNext(
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
                instructions:
                  instructions ||
                  (nextTask
                    ? "Continue with the next task above."
                    : "All tasks completed. Session finished."),
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
