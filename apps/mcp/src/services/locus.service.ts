import { randomUUID } from "node:crypto";
import { LocusClient } from "@locusai/sdk";
import { Sprint, Task, TaskStatus } from "@locusai/shared";
import { logger } from "../lib/logger.js";
import { ClientConfig } from "../lib/types.js";

export class LocusService {
  private client: LocusClient;
  private workspaceId: string;

  constructor(config: ClientConfig) {
    this.workspaceId = config.workspaceId;
    this.client = new LocusClient({
      baseUrl: config.apiUrl || "https://api.locusai.dev/api",
      token: config.apiKey,
    });
  }

  public getClient(): LocusClient {
    return this.client;
  }

  async getActiveSprint(): Promise<Sprint | null> {
    try {
      return await this.client.sprints.getActive(this.workspaceId);
    } catch {
      return null;
    }
  }

  async getSprintTasks(sprintId: string): Promise<Task[]> {
    return await this.client.tasks.list(this.workspaceId, {
      sprintId,
    });
  }

  async updateSprintMindmap(sprintId: string, mindmap: string): Promise<void> {
    await this.client.sprints.update(sprintId, this.workspaceId, {
      mindmap,
      mindmapUpdatedAt: Date.now(),
    });
  }

  async triggerAIPlanning(sprintId: string): Promise<void> {
    await this.client.sprints.triggerAIPlanning(sprintId, this.workspaceId);
  }

  async getTaskContext(taskId: string): Promise<string> {
    try {
      return await this.client.tasks.getContext(taskId, this.workspaceId);
    } catch {
      return "";
    }
  }

  async dispatchTask(sprintId?: string): Promise<Task | null> {
    const agentId = `mcp-agent-${randomUUID()}`;
    try {
      logger.info("LocusService", `Dispatching task for agent ${agentId}...`);
      const task = await this.client.workspaces.dispatch(
        this.workspaceId,
        agentId,
        sprintId
      );
      if (task) logger.info("LocusService", `Dispatched task ${task.id}`);
      return task;
    } catch (_e) {
      logger.warn(
        "LocusService",
        "Direct dispatch failed, trying available tasks..."
      );
      // Fallback: Pick from available tasks in the sprint/backlog
      try {
        const tasks = await this.client.tasks.getAvailable(
          this.workspaceId,
          sprintId
        );
        const task = tasks[0] || null;
        if (task)
          logger.info("LocusService", `Picked available task ${task.id}`);
        return task;
      } catch (e2) {
        logger.error("LocusService", "Failed to get any tasks", e2);
        return null;
      }
    }
  }

  async completeTask(taskId: string, summary: string): Promise<void> {
    logger.info(
      "LocusService",
      `Completing task ${taskId} with status VERIFICATION...`
    );
    try {
      await this.client.tasks.update(taskId, this.workspaceId, {
        status: TaskStatus.VERIFICATION,
      });
      logger.info("LocusService", `Task ${taskId} updated successfully.`);
    } catch (error) {
      logger.error("LocusService", `Failed to update task ${taskId}:`, error);
      throw error;
    }

    await this.client.tasks.addComment(taskId, this.workspaceId, {
      text: `✅ Task completed via Agent.\n\nSummary:\n${summary}`,
      author: "Agent",
    });
  }

  async addArtifactComment(taskId: string, artifacts: string[]): Promise<void> {
    if (!artifacts.length) return;

    const artifactList = artifacts.map((a) => `- ${a}`).join("\n");
    await this.client.tasks.addComment(taskId, this.workspaceId, {
      text: `Artifacts generated:\n${artifactList}`,
      author: "Agent",
    });
  }
}
