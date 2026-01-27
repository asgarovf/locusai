import { DynamicStructuredTool } from "@langchain/core/tools";
import { CreateSprintSchema } from "@locusai/shared";
import { z } from "zod";
import { ISprintProvider } from "./interfaces";

export const createCreateSprintTool = (
  provider: ISprintProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "create_sprint",
    description:
      "Create a new sprint. Sprints handle a collection of tasks for a specific time period. Set a clear goal.",
    schema: CreateSprintSchema,
    func: async (input) => {
      try {
        const sprint = await provider.create(workspaceId, input);
        return JSON.stringify({
          success: true,
          message: `Created sprint "${sprint.name}"`,
          sprintId: sprint.id,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create sprint",
        });
      }
    },
  });

export const createListSprintsTool = (
  provider: ISprintProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "list_sprints",
    description: "List all sprints in the workspace.",
    schema: z.object({}),
    func: async () => {
      try {
        const sprints = await provider.list(workspaceId);
        return JSON.stringify({
          success: true,
          count: sprints.length,
          sprints: sprints.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            goal: s.name, // Mapping name to goal for now as shared model doesn't have goal
            startDate: s.startDate,
            endDate: s.endDate,
          })),
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to list sprints",
        });
      }
    },
  });

export const createPlanSprintTool = (
  provider: ISprintProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "plan_sprint",
    description:
      "Trigger AI-driven sprint planning. This will analyze dependencies and reorder tasks based on the sprint context. Use this when the user asks to plan, reorder, or organize a sprint.",
    schema: z.object({
      sprintId: z.string().describe("The ID of the sprint to plan"),
    }),
    func: async ({ sprintId }) => {
      try {
        const sprint = await provider.plan(workspaceId, sprintId);
        return JSON.stringify({
          success: true,
          message: `Sprint "${sprint.name}" has been successfully planned and reordered.`,
          sprintId: sprint.id,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to plan sprint",
        });
      }
    },
  });
