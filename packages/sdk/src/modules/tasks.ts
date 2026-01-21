import {
  AddComment,
  Comment,
  CommentResponse,
  CreateTask,
  Task,
  TaskResponse,
  TasksResponse,
  UpdateTask,
} from "@locusai/shared";
import { BaseModule } from "./base";

export class TasksModule extends BaseModule {
  async list(workspaceId: string): Promise<Task[]> {
    const { data } = await this.api.get<TasksResponse>(
      `/workspaces/${workspaceId}/tasks`
    );
    return data.tasks;
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

  async lock(
    id: string,
    workspaceId: string,
    body: { agentId: string; ttlSeconds: number }
  ): Promise<void> {
    await this.api.post(`/workspaces/${workspaceId}/tasks/${id}/lock`, body);
  }

  async unlock(
    id: string,
    workspaceId: string,
    body: { agentId: string }
  ): Promise<void> {
    await this.api.post(`/workspaces/${workspaceId}/tasks/${id}/unlock`, body);
  }
}
