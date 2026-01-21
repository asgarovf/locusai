import {
  ActivityResponse,
  CreateWorkspace,
  Event,
  UpdateWorkspace,
  Workspace,
  WorkspaceResponse,
  WorkspaceStats,
  WorkspacesResponse,
} from "@locusai/shared";
import { BaseModule } from "./base";

export class WorkspacesModule extends BaseModule {
  async listAll(): Promise<Workspace[]> {
    const { data } = await this.api.get<WorkspacesResponse>("/workspaces");
    return data.workspaces;
  }

  async listByOrg(orgId: string): Promise<Workspace[]> {
    const { data } = await this.api.get<WorkspacesResponse>(
      `/workspaces/org/${orgId}`
    );
    return data.workspaces;
  }

  async create(body: CreateWorkspace & { orgId: string }): Promise<Workspace> {
    const { orgId, ...bodyWithoutOrgId } = body;
    const { data } = await this.api.post<WorkspaceResponse>(
      `/workspaces/org/${orgId}`,
      bodyWithoutOrgId
    );
    return data.workspace;
  }

  async getById(id: string): Promise<Workspace> {
    const { data } = await this.api.get<WorkspaceResponse>(`/workspaces/${id}`);
    return data.workspace;
  }

  async update(id: string, body: UpdateWorkspace): Promise<Workspace> {
    const { data } = await this.api.put<WorkspaceResponse>(
      `/workspaces/${id}`,
      body
    );
    return data.workspace;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/workspaces/${id}`);
  }

  async getStats(id: string): Promise<WorkspaceStats> {
    const { data } = await this.api.get<WorkspaceStats>(
      `/workspaces/${id}/stats`
    );
    return data;
  }

  async getActivity(id: string, limit?: number): Promise<Event[]> {
    const { data } = await this.api.get<ActivityResponse>(
      `/workspaces/${id}/activity`,
      {
        params: { limit },
      }
    );
    return data.activity;
  }
}
