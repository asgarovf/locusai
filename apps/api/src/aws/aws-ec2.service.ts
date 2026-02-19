import {
  type _InstanceType,
  AuthorizeSecurityGroupIngressCommand,
  CreateSecurityGroupCommand,
  DeleteSecurityGroupCommand,
  DescribeInstancesCommand,
  DescribeSecurityGroupRulesCommand,
  EC2Client,
  RevokeSecurityGroupIngressCommand,
  RunInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import { AwsCredentials } from "@locusai/shared";
import { Injectable, Logger } from "@nestjs/common";

interface LaunchParams {
  instanceType: string;
  amiId: string;
  securityGroupId: string;
  keyName?: string;
  userData?: string;
}

interface DescribeResult {
  state: string | undefined;
  publicIp: string | undefined;
}

interface CreateSecurityGroupParams {
  groupName: string;
  description: string;
  vpcId?: string;
}

export interface SecurityGroupRule {
  port: number;
  cidr: string;
  description?: string;
}

@Injectable()
export class AwsEc2Service {
  private readonly logger = new Logger(AwsEc2Service.name);

  private createClient(credentials: AwsCredentials): EC2Client {
    return new EC2Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
  }

  async launchInstance(
    credentials: AwsCredentials,
    params: LaunchParams
  ): Promise<string> {
    const client = this.createClient(credentials);
    try {
      const result = await client.send(
        new RunInstancesCommand({
          ImageId: params.amiId,
          InstanceType: params.instanceType as _InstanceType,
          MinCount: 1,
          MaxCount: 1,
          SecurityGroupIds: [params.securityGroupId],
          KeyName: params.keyName,
          UserData: params.userData
            ? Buffer.from(params.userData).toString("base64")
            : undefined,
          TagSpecifications: [
            {
              ResourceType: "instance",
              Tags: [
                {
                  Key: "Name",
                  Value: `locus-agent-${Date.now()}`,
                },
              ],
            },
          ],
        })
      );

      const instanceId = result.Instances?.[0]?.InstanceId;
      if (!instanceId) {
        throw new Error("EC2 RunInstances did not return an instance ID");
      }

      this.logger.log(`Launched EC2 instance ${instanceId}`);
      return instanceId;
    } finally {
      client.destroy();
    }
  }

  async describeInstance(
    credentials: AwsCredentials,
    instanceId: string
  ): Promise<DescribeResult> {
    const client = this.createClient(credentials);
    try {
      const result = await client.send(
        new DescribeInstancesCommand({
          InstanceIds: [instanceId],
        })
      );

      const instance = result.Reservations?.[0]?.Instances?.[0];
      return {
        state: instance?.State?.Name,
        publicIp: instance?.PublicIpAddress,
      };
    } finally {
      client.destroy();
    }
  }

  async startInstance(
    credentials: AwsCredentials,
    instanceId: string
  ): Promise<void> {
    const client = this.createClient(credentials);
    try {
      await client.send(
        new StartInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
      this.logger.log(`Started EC2 instance ${instanceId}`);
    } finally {
      client.destroy();
    }
  }

  async stopInstance(
    credentials: AwsCredentials,
    instanceId: string
  ): Promise<void> {
    const client = this.createClient(credentials);
    try {
      await client.send(
        new StopInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
      this.logger.log(`Stopped EC2 instance ${instanceId}`);
    } finally {
      client.destroy();
    }
  }

  async terminateInstance(
    credentials: AwsCredentials,
    instanceId: string
  ): Promise<void> {
    const client = this.createClient(credentials);
    try {
      await client.send(
        new TerminateInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
      this.logger.log(`Terminated EC2 instance ${instanceId}`);
    } finally {
      client.destroy();
    }
  }

  async createSecurityGroup(
    credentials: AwsCredentials,
    params: CreateSecurityGroupParams
  ): Promise<string> {
    const client = this.createClient(credentials);
    try {
      const createResult = await client.send(
        new CreateSecurityGroupCommand({
          GroupName: params.groupName,
          Description: params.description,
          VpcId: params.vpcId,
        })
      );

      const groupId = createResult.GroupId;
      if (!groupId) {
        throw new Error(
          "CreateSecurityGroup did not return a security group ID"
        );
      }

      // Add SSH inbound rule (port 22)
      await client.send(
        new AuthorizeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [
            {
              IpProtocol: "tcp",
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "SSH access" }],
            },
          ],
        })
      );

      this.logger.log(
        `Created security group ${groupId} (${params.groupName})`
      );
      return groupId;
    } finally {
      client.destroy();
    }
  }

  async deleteSecurityGroup(
    credentials: AwsCredentials,
    groupId: string
  ): Promise<void> {
    const client = this.createClient(credentials);
    try {
      await client.send(
        new DeleteSecurityGroupCommand({
          GroupId: groupId,
        })
      );
      this.logger.log(`Deleted security group ${groupId}`);
    } finally {
      client.destroy();
    }
  }

  async getSecurityGroupRules(
    credentials: AwsCredentials,
    securityGroupId: string
  ): Promise<SecurityGroupRule[]> {
    const client = this.createClient(credentials);
    try {
      const result = await client.send(
        new DescribeSecurityGroupRulesCommand({
          Filters: [
            {
              Name: "group-id",
              Values: [securityGroupId],
            },
          ],
        })
      );

      return (result.SecurityGroupRules ?? [])
        .filter((rule) => !rule.IsEgress)
        .map((rule) => ({
          port: rule.FromPort ?? 0,
          cidr: rule.CidrIpv4 ?? "0.0.0.0/0",
          description: rule.Description,
        }));
    } finally {
      client.destroy();
    }
  }

  async updateSecurityGroupIngress(
    credentials: AwsCredentials,
    securityGroupId: string,
    rules: SecurityGroupRule[]
  ): Promise<void> {
    const client = this.createClient(credentials);
    try {
      // First, get existing ingress rules to revoke them
      const existing = await client.send(
        new DescribeSecurityGroupRulesCommand({
          Filters: [
            {
              Name: "group-id",
              Values: [securityGroupId],
            },
          ],
        })
      );

      const ingressRules = (existing.SecurityGroupRules ?? []).filter(
        (rule) => !rule.IsEgress
      );

      // Revoke all existing ingress rules
      if (ingressRules.length > 0) {
        await client.send(
          new RevokeSecurityGroupIngressCommand({
            GroupId: securityGroupId,
            SecurityGroupRuleIds: ingressRules
              .map((r) => r.SecurityGroupRuleId)
              .filter((id): id is string => !!id),
          })
        );
      }

      // Authorize new ingress rules
      if (rules.length > 0) {
        await client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupId: securityGroupId,
            IpPermissions: rules.map((rule) => ({
              IpProtocol: "tcp",
              FromPort: rule.port,
              ToPort: rule.port,
              IpRanges: [
                {
                  CidrIp: rule.cidr,
                  Description: rule.description ?? "SSH access",
                },
              ],
            })),
          })
        );
      }

      this.logger.log(
        `Updated security group ${securityGroupId} with ${rules.length} ingress rule(s)`
      );
    } finally {
      client.destroy();
    }
  }

  async validateCredentials(credentials: AwsCredentials): Promise<boolean> {
    const client = this.createClient(credentials);
    try {
      await client.send(new DescribeInstancesCommand({ DryRun: true }));
      // DryRun succeeds — should not happen, but credentials are valid
      return true;
    } catch (error: unknown) {
      // DryRun always throws: "DryRunOperation" means credentials are valid
      const err = error as { Code?: string; name?: string; message?: string };
      if (err.Code === "DryRunOperation" || err.name === "DryRunOperation") {
        return true;
      }
      // Any auth error means credentials are invalid
      this.logger.warn(
        `AWS credential validation failed: ${err.message ?? "Unknown error"}`
      );
      return false;
    } finally {
      client.destroy();
    }
  }
}
