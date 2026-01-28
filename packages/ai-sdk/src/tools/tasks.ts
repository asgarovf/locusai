import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  CreateTaskSchema,
  SprintStatus,
  UpdateTask,
  UpdateTaskSchema,
} from "@locusai/shared";
import { z } from "zod";
import { ISprintProvider, ITaskProvider } from "./interfaces";

export const createCreateTaskTool = (
  provider: ITaskProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "create_task",
    description:
      "Create a new task in the workspace. Provide a professional, detailed description and a comprehensive acceptance checklist. If this task is derived from a document, link it using 'docIds'.",
    schema: CreateTaskSchema,
    func: async (input) => {
      try {
        const task = await provider.create(workspaceId, input);
        return JSON.stringify({
          success: true,
          message: `Created task "${task.title}"`,
          taskId: task.id,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create task",
        });
      }
    },
  });

export const createListTasksTool = (
  provider: ITaskProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "list_tasks",
    description: "List all tasks in the workspace. Can be filtered by status.",
    schema: z.object({
      status: z
        .string()
        .optional()
        .describe(
          "Status to filter by (e.g. 'BACKLOG', 'TODO', 'IN_PROGRESS')"
        ),
      search: z
        .string()
        .optional()
        .describe("Search term to filter tasks by title or description"),
    }),
    func: async ({ status, search }) => {
      try {
        const allTasks = await provider.list(workspaceId);
        let tasks = allTasks;
        let warning = "";

        if (status) {
          const filtered = tasks.filter(
            (t) => t.status.toLowerCase() === status.toLowerCase()
          );
          if (filtered.length === 0) {
            warning = `No tasks found with status '${status}'. Showing all tasks.`;
            // specific fallback: if user asked for BACKLOG but tasks are TODO
            if (status.toUpperCase() === "BACKLOG") {
              const todoTasks = tasks.filter(
                (t) => (t.status as string) === "TODO"
              ); // cast to string to handle potential data inconsistency
              if (todoTasks.length > 0) {
                tasks = todoTasks;
                warning =
                  "No 'BACKLOG' tasks found, but found 'TODO' tasks. Showing those.";
              }
            }
          } else {
            tasks = filtered;
          }
        }

        if (search) {
          const lower = search.toLowerCase();
          tasks = tasks.filter(
            (t) =>
              t.title.toLowerCase().includes(lower) ||
              t.description?.toLowerCase().includes(lower)
          );
        }

        return JSON.stringify({
          success: true,
          count: tasks.length,
          warning: warning || undefined,
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            description: t.description,
          })),
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to list tasks",
        });
      }
    },
  });

export const createUpdateTaskTool = (
  provider: ITaskProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "update_task",
    description:
      "Update an existing task's properties like title, description, status, priority, or sprintId.",
    schema: z.object({
      id: z.string().describe("The ID of the task to update"),
      updates: UpdateTaskSchema,
    }),
    func: async ({ id, updates }) => {
      try {
        const task = await provider.update(id, workspaceId, updates);
        return JSON.stringify({
          success: true,
          message: `Updated task "${task.title}"`,
          taskId: task.id,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update task",
        });
      }
    },
  });

export const createBatchUpdateTasksTool = (
  provider: ITaskProvider,
  sprintProvider: ISprintProvider, // Add sprint provider
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "batch_update_tasks",
    description:
      "Update multiple tasks at once. ESSENTIAL usage: 1) Move tasks to active sprint: set sprintId='active'. 2) Move to next sprint: set sprintId='next'. The system AUTO-DETECTS the correct sprint (Active or Planned) or creates one if missing. Do NOT fail if you don't see an ACTIVE sprint in list_sprints; just use this tool.",
    schema: z.object({
      ids: z.array(z.string()).describe("List of task IDs to update"),
      updates: UpdateTaskSchema.extend({
        sprintId: z
          .string()
          .describe(
            "UUID of the sprint. USE 'active' (or 'next') to automatically target the active/planned sprint. Do not fail if you don't have an ID."
          )
          .optional()
          .nullable(),
      }),
    }),
    func: async ({ ids, updates }) => {
      try {
        let sprintId = updates.sprintId;

        let sprintCreated = false;
        // Auto-resolve sprint alias
        if (sprintId === "active" || sprintId === "next") {
          const sprints = await sprintProvider.list(workspaceId);
          const activeSprint =
            sprints.find((s) => s.status === SprintStatus.ACTIVE) ||
            sprints.find((s) => s.status === SprintStatus.PLANNED);

          if (!activeSprint) {
            // Create a new sprint if none exists
            const nextSprintNum = sprints.length + 1;
            const newSprint = await sprintProvider.create(workspaceId, {
              name: `Sprint ${nextSprintNum}`,
            });
            sprintId = newSprint.id;
            sprintCreated = true;
          } else {
            sprintId = activeSprint.id;
          }
        }

        // Apply potentially resolved sprintId
        const finalUpdates = { ...updates };
        if (sprintId) {
          finalUpdates.sprintId = sprintId;
        }

        await provider.batchUpdate(
          ids,
          workspaceId,
          finalUpdates as UpdateTask
        );
        return JSON.stringify({
          success: true,
          message: `Successfully updated ${ids.length} tasks to sprint (ID: ${sprintId}).${sprintCreated ? " Created a new sprint as none existed." : ""}`,
          resolvedSprintId: sprintId,
          sprintCreated,
          hint: "If you moved tasks to a sprint, consider running 'plan_sprint' to optimize the schedule.",
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to batch update tasks",
        });
      }
    },
  });
