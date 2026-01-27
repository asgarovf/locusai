import { DynamicStructuredTool } from "@langchain/core/tools";
import { CreateTaskSchema, TaskStatus } from "@locusai/shared";
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
    }),
    func: async () => {
      try {
        const tasks = await provider.list(workspaceId);
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
