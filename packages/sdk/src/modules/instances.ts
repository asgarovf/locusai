import {
  type InstanceAction,
  type ProvisionAwsInstance,
} from "@locusai/shared";
import { BaseModule } from "./base.js";

export interface InstanceInfo {
  id: string;
  workspaceId: string;
  awsCredentialId: string;
  ec2InstanceId: string | null;
  status: string;
  instanceType: string;
  region: string;
  publicIp: string | null;
  repoUrl: string;
  integrations: unknown[];
  securityGroupId: string | null;
  errorMessage: string | null;
  launchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InstanceResponse {
  instance: InstanceInfo;
}

interface InstancesResponse {
  instances: InstanceInfo[];
}

export class InstancesModule extends BaseModule {
  async list(workspaceId: string): Promise<InstanceInfo[]> {
    const { data } = await this.api.get<InstancesResponse>(
      `/workspaces/${workspaceId}/aws-instances`
    );
    return data.instances;
  }

  async get(workspaceId: string, instanceId: string): Promise<InstanceInfo> {
    const { data } = await this.api.get<InstanceResponse>(
      `/workspaces/${workspaceId}/aws-instances/${instanceId}`
    );
    return data.instance;
  }

  async provision(
    workspaceId: string,
    body: ProvisionAwsInstance
  ): Promise<InstanceInfo> {
    const { data } = await this.api.post<InstanceResponse>(
      `/workspaces/${workspaceId}/aws-instances`,
      body
    );
    return data.instance;
  }

  async performAction(
    workspaceId: string,
    instanceId: string,
    action: InstanceAction
  ): Promise<InstanceInfo> {
    const { data } = await this.api.post<InstanceResponse>(
      `/workspaces/${workspaceId}/aws-instances/${instanceId}/actions`,
      { action }
    );
    return data.instance;
  }

  async sync(workspaceId: string, instanceId: string): Promise<InstanceInfo> {
    const { data } = await this.api.post<InstanceResponse>(
      `/workspaces/${workspaceId}/aws-instances/${instanceId}/sync`
    );
    return data.instance;
  }
}
