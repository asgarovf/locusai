import {
  AddComment,
  Comment,
  CommentResponse,
  CreateTask,
  Task,
  TaskResponse,
  TaskStatus,
  TasksResponse,
  UpdateTask,
} from "@locusai/shared";
import { BaseModule } from "./base.js";

export interface TaskListOptions {
  sprintId?: string;
  status?: TaskStatus | TaskStatus[];
}

export class TasksModule extends BaseModule {
  /**
   * List all tasks in a workspace, optionally filtered
   */
  async list(workspaceId: string, options?: TaskListOptions): Promise<Task[]> {
    const { data } = await this.api.get<TasksResponse>(
      `/workspaces/${workspaceId}/tasks`
    );

    let tasks = data.tasks;

    // Client-side filtering (API doesn't support query params yet)
    if (options?.sprintId) {
      tasks = tasks.filter((t) => t.sprintId === options.sprintId);
    }

    if (options?.status) {
      const statuses = Array.isArray(options.status)
        ? options.status
        : [options.status];
      tasks = tasks.filter((t) => statuses.includes(t.status as TaskStatus));
    }

    return tasks;
  }

  /**
   * Get available tasks for an agent to work on.
   * Returns tasks in BACKLOG or IN_PROGRESS (unassigned) status.
   */
  async getAvailable(workspaceId: string, sprintId?: string): Promise<Task[]> {
    const tasks = await this.list(workspaceId, {
      sprintId,
    });

    return tasks.filter(
      (t) =>
        t.status === TaskStatus.BACKLOG ||
        (t.status === TaskStatus.IN_PROGRESS && !t.assignedTo)
    );
  }

  async getById(id: string, workspaceId: string): Promise<Task> {
    const { data } = await this.api.get<TaskResponse>(
      `/workspaces/${workspaceId}/tasks/${id}`
    );
    return data.task;
  }

  async create(workspaceId: string, body: CreateTask): Promise<Task> {
    const { data } = await this.api.post<TaskResponse>(
      `/workspaces/${workspaceId}/tasks`,
      body
    );
    return data.task;
  }

  async update(
    id: string,
    workspaceId: string,
    body: UpdateTask
  ): Promise<Task> {
    const { data } = await this.api.patch<TaskResponse>(
      `/workspaces/${workspaceId}/tasks/${id}`,
      body
    );
    return data.task;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/tasks/${id}`);
  }

  async getBacklog(workspaceId: string): Promise<Task[]> {
    const { data } = await this.api.get<TasksResponse>(
      `/workspaces/${workspaceId}/tasks/backlog`
    );
    return data.tasks;
  }

  async addComment(
    id: string,
    workspaceId: string,
    body: AddComment
  ): Promise<Comment> {
    const { data } = await this.api.post<CommentResponse>(
      `/workspaces/${workspaceId}/tasks/${id}/comment`,
      body
    );
    return data.comment;
  }

  async batchUpdate(
    ids: string[],
    workspaceId: string,
    updates: UpdateTask
  ): Promise<void> {
    await this.api.patch(`/workspaces/${workspaceId}/tasks/batch`, {
      ids,
      updates,
    });
  }
}
