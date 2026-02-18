import {
  ActivityResponse,
  AgentRegistrationInfo,
  AgentsList,
  CreateWorkspace,
  Event,
  Task,
  TaskResponse,
  UpdateWorkspace,
  Workspace,
  WorkspaceResponse,
  WorkspaceStats,
  WorkspacesResponse,
} from "@locusai/shared";
import { BaseModule } from "./base.js";

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

  async createWithAutoOrg(body: CreateWorkspace): Promise<Workspace> {
    const { data } = await this.api.post<WorkspaceResponse>(
      "/workspaces",
      body
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

  /**
   * Dispatch a task from the workspace backlog to an agent.
   * Uses server-side locking to prevent double-assignment.
   */
  async dispatch(
    id: string,
    workerId: string,
    sprintId?: string
  ): Promise<Task> {
    const { data } = await this.api.post<TaskResponse>(
      `/workspaces/${id}/dispatch`,
      { workerId, sprintId }
    );
    return data.task;
  }

  // ============================================================================
  // Agent Heartbeat & Registration
  // ============================================================================

  /**
   * Send an agent heartbeat to the API.
   * Creates or updates the agent registration with current status.
   */
  async heartbeat(
    workspaceId: string,
    agentId: string,
    currentTaskId?: string | null,
    status?: "IDLE" | "WORKING" | "COMPLETED" | "FAILED"
  ): Promise<AgentRegistrationInfo> {
    const { data } = await this.api.post<{ agent: AgentRegistrationInfo }>(
      `/workspaces/${workspaceId}/agents/heartbeat`,
      {
        agentId,
        currentTaskId: currentTaskId ?? null,
        status: status ?? "WORKING",
      }
    );
    return data.agent;
  }

  /**
   * Get active agents for a workspace.
   */
  async getAgents(workspaceId: string): Promise<AgentRegistrationInfo[]> {
    const { data } = await this.api.get<AgentsList>(
      `/workspaces/${workspaceId}/agents`
    );
    return data.agents;
  }

  // ============================================================================
  // API Key Management
  // ============================================================================

  async listApiKeys(workspaceId: string): Promise<WorkspaceApiKey[]> {
    const { data } = await this.api.get<ApiKeysResponse>(
      `/workspaces/${workspaceId}/api-keys`
    );
    return data.apiKeys;
  }

  async createApiKey(
    workspaceId: string,
    name: string
  ): Promise<WorkspaceApiKey> {
    const { data } = await this.api.post<ApiKeyResponse>(
      `/workspaces/${workspaceId}/api-keys`,
      { name }
    );
    return data.apiKey;
  }

  async deleteApiKey(workspaceId: string, keyId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/api-keys/${keyId}`);
  }

  // ============================================================================
  // AWS Credentials Management
  // ============================================================================

  async getAwsCredentials(
    workspaceId: string
  ): Promise<AwsCredentialInfo> {
    const { data } = await this.api.get<AwsCredentialResponse>(
      `/workspaces/${workspaceId}/aws-credentials`
    );
    return data.credential;
  }

  async saveAwsCredentials(
    workspaceId: string,
    body: SaveAwsCredentialsInput
  ): Promise<AwsCredentialInfo> {
    const { data } = await this.api.put<AwsCredentialResponse>(
      `/workspaces/${workspaceId}/aws-credentials`,
      body
    );
    return data.credential;
  }

  async deleteAwsCredentials(workspaceId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/aws-credentials`);
  }
}

export interface WorkspaceApiKey {
  id: string;
  organizationId?: string | null;
  workspaceId?: string | null;
  name: string;
  key: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiKeysResponse {
  apiKeys: WorkspaceApiKey[];
}

interface ApiKeyResponse {
  apiKey: WorkspaceApiKey;
}

export interface AwsCredentialInfo {
  id: string;
  accessKeyId?: string;
  region: string;
  createdAt: string;
  updatedAt?: string;
}

interface AwsCredentialResponse {
  credential: AwsCredentialInfo;
}

export interface SaveAwsCredentialsInput {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}
