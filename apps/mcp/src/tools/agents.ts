import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPatch, apiPost, error, success } from "../api.js";
import { ROLE_PROMPTS, type Task } from "../types.js";

export function registerAgentTools(server: McpServer): void {
  // Agent claim task - skill-based task assignment
  server.registerTool(
    "agent.claim-task",
    {
      title: "Claim Next Task (Agent)",
      description:
        "Agent claims the next available task matching their skills. Returns task details with full context. Call this first when the agent starts, then after completing a task.",
      inputSchema: {
        agentId: z.string(),
        skills: z.array(z.string()),
        sprintId: z.string(),
        workspaceId: z.string(),
      },
    },
    async ({ agentId, skills, sprintId, workspaceId }) => {
      try {
        // Get tasks in sprint
        const tasks = await apiGet<Task[]>(
          `/tasks?sprintId=${sprintId}&workspaceId=${workspaceId}`
        );

        if (!tasks || tasks.length === 0) {
          return success({
            message: "No tasks available in sprint",
            sprintId,
            agentId,
          });
        }

        // Find unlocked task matching agent skills or any unlocked task
        let assignedTask: Task | undefined;

        // First priority: task with matching assigneeRole
        assignedTask = tasks.find(
          (t) =>
            !t.lockedBy &&
            t.status !== "DONE" &&
            t.status !== "VERIFICATION" &&
            t.assigneeRole &&
            skills.includes(t.assigneeRole)
        );

        // Fallback: any unlocked task
        if (!assignedTask) {
          assignedTask = tasks.find(
            (t) =>
              !t.lockedBy && t.status !== "DONE" && t.status !== "VERIFICATION"
          );
        }

        if (!assignedTask) {
          return success({
            message: "No available tasks matching your skills",
            sprintId,
            skills,
            agentId,
          });
        }

        // Lock the task for this agent
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
        await apiPatch(`/tasks/${assignedTask.id}`, {
          lockedBy: agentId,
          lockExpiresAt: expiresAt.toISOString(),
          assignedTo: agentId,
        });

        // Get system instructions for the agent based on role
        const systemInstructions =
          assignedTask.assigneeRole && ROLE_PROMPTS[assignedTask.assigneeRole];

        return success({
          message: "Task claimed successfully",
          agentId,
          task: {
            ...assignedTask,
            systemInstructions,
          },
          hint: "Now call agent.start-task to begin work",
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Agent start task - update status to IN_PROGRESS
  server.registerTool(
    "agent.start-task",
    {
      title: "Start Working on Task",
      description:
        "Update task status to IN_PROGRESS. Call this after claiming a task and before starting work.",
      inputSchema: {
        taskId: z.string(),
        agentId: z.string(),
      },
    },
    async ({ taskId, agentId }) => {
      try {
        const data = await apiPatch(`/tasks/${taskId}`, {
          status: "IN_PROGRESS",
        });
        return success({
          message: "Task status updated to IN_PROGRESS",
          task: data,
          agentId,
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Agent complete task - move to VERIFICATION
  server.registerTool(
    "agent.complete-task",
    {
      title: "Mark Task as Complete",
      description:
        "Move task to VERIFICATION status when work is done. This prepares it for human review. The DONE status is reserved for manual approval only.",
      inputSchema: {
        taskId: z.string(),
        agentId: z.string(),
        summary: z.string().optional(),
        artifactIds: z.array(z.string()).optional(),
      },
    },
    async ({ taskId, agentId, summary, artifactIds }) => {
      try {
        const data = await apiPatch(`/tasks/${taskId}`, {
          status: "VERIFICATION",
          lockedBy: null,
          lockExpiresAt: null,
        });

        // Add completion comment if summary provided
        if (summary) {
          await apiPost(`/tasks/${taskId}/comment`, {
            author: agentId,
            text: `✅ Task completed\n\n${summary}${artifactIds ? `\n\nArtifacts created: ${artifactIds.join(", ")}` : ""}`,
          });
        }

        return success({
          message: "Task moved to VERIFICATION",
          task: data,
          agentId,
          hint: "You can now claim another task or wait for human review",
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Agent fail task - unlock and add error note
  server.registerTool(
    "agent.fail-task",
    {
      title: "Fail Task (with Error)",
      description:
        "Unlock and return a task when the agent encounters an error and cannot complete it. Add a detailed error message.",
      inputSchema: {
        taskId: z.string(),
        agentId: z.string(),
        error: z.string(),
      },
    },
    async ({ taskId, agentId, error: errorMsg }) => {
      try {
        const data = await apiPatch(`/tasks/${taskId}`, {
          lockedBy: null,
          lockExpiresAt: null,
          status: "BACKLOG",
        });

        // Add error comment
        await apiPost(`/tasks/${taskId}/comment`, {
          author: agentId,
          text: `❌ Agent failed to complete task:\n\n${errorMsg}`,
        });

        return success({
          message: "Task unlocked and returned to backlog",
          task: data,
          agentId,
          error: errorMsg,
          hint: "Another agent can claim this task later",
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );

  // Get available tasks (for agent planning)
  server.registerTool(
    "agent.list-available",
    {
      title: "List Available Tasks",
      description:
        "See what tasks are available in the sprint for your agent to choose from or plan around.",
      inputSchema: {
        sprintId: z.string(),
        workspaceId: z.string(),
        skills: z.array(z.string()).optional(),
      },
    },
    async ({ sprintId, workspaceId, skills }) => {
      try {
        const tasks = await apiGet<Task[]>(
          `/tasks?sprintId=${sprintId}&workspaceId=${workspaceId}`
        );

        let filtered = tasks.filter(
          (t) =>
            !t.lockedBy && t.status !== "DONE" && t.status !== "VERIFICATION"
        );

        if (skills && skills.length > 0) {
          filtered = filtered.filter(
            (t) => !t.assigneeRole || skills.includes(t.assigneeRole)
          );
        }

        return success({
          message: `${filtered.length} available tasks`,
          tasks: filtered.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            assigneeRole: t.assigneeRole,
            description: t.description,
          })),
          sprintId,
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );
}
