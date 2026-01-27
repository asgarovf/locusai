import {
  CreateSprint,
  Sprint,
  SprintResponse,
  SprintsResponse,
  UpdateSprint,
} from "@locusai/shared";
import { BaseModule } from "./base.js";

export class SprintsModule extends BaseModule {
  async list(workspaceId: string): Promise<Sprint[]> {
    const { data } = await this.api.get<SprintsResponse>(
      `/workspaces/${workspaceId}/sprints`
    );
    return data.sprints;
  }

  async getActive(workspaceId: string): Promise<Sprint> {
    const { data } = await this.api.get<SprintResponse>(
      `/workspaces/${workspaceId}/sprints/active`
    );
    return data.sprint;
  }

  async getById(id: string, workspaceId: string): Promise<Sprint> {
    const { data } = await this.api.get<SprintResponse>(
      `/workspaces/${workspaceId}/sprints/${id}`
    );
    return data.sprint;
  }

  async create(workspaceId: string, body: CreateSprint): Promise<Sprint> {
    const { data } = await this.api.post<SprintResponse>(
      `/workspaces/${workspaceId}/sprints`,
      body
    );
    return data.sprint;
  }

  async update(
    id: string,
    workspaceId: string,
    body: UpdateSprint
  ): Promise<Sprint> {
    const { data } = await this.api.patch<SprintResponse>(
      `/workspaces/${workspaceId}/sprints/${id}`,
      body
    );
    return data.sprint;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/sprints/${id}`);
  }

  async start(id: string, workspaceId: string): Promise<Sprint> {
    const { data } = await this.api.post<SprintResponse>(
      `/workspaces/${workspaceId}/sprints/${id}/start`
    );
    return data.sprint;
  }

  async complete(id: string, workspaceId: string): Promise<Sprint> {
    const { data } = await this.api.post<SprintResponse>(
      `/workspaces/${workspaceId}/sprints/${id}/complete`
    );
    return data.sprint;
  }

  async triggerAIPlanning(id: string, workspaceId: string): Promise<Sprint> {
    const { data } = await this.api.post<SprintResponse>(
      `/workspaces/${workspaceId}/sprints/${id}/trigger-ai-planning`
    );
    return data.sprint;
  }
}
