import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  CreateTaskSchema,
  TaskStatus,
  UpdateTaskSchema,
} from "@locusai/shared";
import { z } from "zod";
import { ITaskProvider } from "./interfaces";

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
      status: z.enum(TaskStatus).optional(),
      search: z
        .string()
        .optional()
        .describe("Search term to filter tasks by title or description"),
    }),
    func: async ({ status, search }) => {
      try {
        let tasks = await provider.list(workspaceId);

        if (status) {
          tasks = tasks.filter((t) => t.status === status);
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
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "batch_update_tasks",
    description:
      "Update multiple tasks at once. Useful for moving multiple tasks to a sprint or changing their status together.",
    schema: z.object({
      ids: z.array(z.string()).describe("List of task IDs to update"),
      updates: UpdateTaskSchema,
    }),
    func: async ({ ids, updates }) => {
      try {
        await provider.batchUpdate(ids, workspaceId, updates);
        return JSON.stringify({
          success: true,
          message: `Successfully updated ${ids.length} tasks.`,
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
