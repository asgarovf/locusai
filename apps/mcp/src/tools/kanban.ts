import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPatch, apiPost, error, success } from "../api.js";
import { ROLE_PROMPTS, type Sprint, type Task } from "../types.js";

export function registerKanbanTools(server: McpServer): void {
  // View active sprint tasks
  server.registerTool(
    "kanban.sprint",
    {
      title: "View Active Sprint",
      description:
        "View all tasks in the active sprint with their status. Use this to see sprint progress. To claim a task to work on, use kanban.next instead.",
      inputSchema: {},
    },
    async () => {
      try {
        const sprints = await apiGet<Sprint[]>("/sprints");
        const activeSprint = sprints.find((s) => s.status === "ACTIVE");

        if (!activeSprint) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: "NO_ACTIVE_SPRINT",
                    message:
                      "No active sprint found. Please start a sprint from the Backlog before requesting tasks.",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Get tasks for this sprint
        const tasks = await apiGet<Task[]>(
          `/tasks?sprintId=${activeSprint.id}`
        );

        return success({
          sprint: { id: activeSprint.id, name: activeSprint.name },
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            assigneeRole: t.assigneeRole,
          })),
          hint: "Use kanban.next to claim and start working on the next available task.",
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Priority queue - get next task to work on from active sprint
  server.registerTool(
    "kanban.next",
    {
      title: "Get & Claim Next Task",
      description:
        "START HERE: Get and claim the next highest priority task from the active sprint. This is the PRIMARY way to get a task to work on. The task is automatically assigned to you. Returns full task details including acceptance criteria.",
      inputSchema: {
        workerId: z.string().optional(),
      },
    },
    async ({ workerId }) => {
      try {
        // First, check if there's an active sprint
        const sprints = await apiGet<Sprint[]>("/sprints");
        const activeSprint = sprints.find((s) => s.status === "ACTIVE");

        if (!activeSprint) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: "NO_ACTIVE_SPRINT",
                    message:
                      "No active sprint found. Please start a sprint from the Backlog before requesting tasks.",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Dispatch task from the active sprint
        const {
          data: task,
          status,
          ok,
        } = await apiPost<Task>("/tasks/dispatch", {
          workerId,
          sprintId: String(activeSprint.id),
        });

        if (status === 404) {
          return success({
            message: `No tasks available in active sprint "${activeSprint.name}"`,
            sprintId: activeSprint.id,
            sprintName: activeSprint.name,
          });
        }

        if (!ok) {
          throw new Error("Failed to dispatch task");
        }

        // Inject system prompts
        const systemInstructions =
          task.assigneeRole && ROLE_PROMPTS[task.assigneeRole];

        return success({
          message: "Assigned task",
          sprint: { id: activeSprint.id, name: activeSprint.name },
          task: { ...task, systemInstructions },
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Get specific task details
  server.registerTool(
    "kanban.get",
    {
      title: "Get Task Details",
      description:
        "Get full details of a task you already know the ID for. Use kanban.next to claim a new task instead of this.",
      inputSchema: { taskId: z.number() },
    },
    async ({ taskId }) => {
      try {
        const data = await apiGet<Task>(`/tasks/${taskId}`);
        const systemInstructions =
          data.assigneeRole && ROLE_PROMPTS[data.assigneeRole];
        return success({ ...data, systemInstructions });
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Move task status
  server.registerTool(
    "kanban.move",
    {
      title: "Move Task Status",
      description:
        "Update task status. When work is complete, move to VERIFICATION (NOT DONE). Valid statuses: IN_PROGRESS, VERIFICATION. The DONE status is reserved for manual approval only.",
      inputSchema: {
        taskId: z.number(),
        status: z.string(),
      },
    },
    async ({ taskId, status }) => {
      try {
        const data = await apiPatch(`/tasks/${taskId}`, { status });
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Check acceptance criteria
  server.registerTool(
    "kanban.check",
    {
      title: "Check Acceptance Item",
      description:
        "Mark acceptance checklist items as completed. Pass the full updated checklist array with completed items marked.",
      inputSchema: {
        taskId: z.number(),
        acceptanceChecklist: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            done: z.boolean(),
          })
        ),
      },
    },
    async ({ taskId, acceptanceChecklist }) => {
      try {
        const data = await apiPatch(`/tasks/${taskId}`, {
          acceptanceChecklist,
        });
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Add comment
  server.registerTool(
    "kanban.comment",
    {
      title: "Add Comment",
      description: "Add a comment to a task",
      inputSchema: {
        taskId: z.number(),
        author: z.string(),
        text: z.string(),
      },
    },
    async ({ taskId, author, text }) => {
      try {
        const { data } = await apiPost(`/tasks/${taskId}/comment`, {
          author,
          text,
        });
        return success(data);
      } catch (e) {
        return error(String(e));
      }
    }
  );
}
