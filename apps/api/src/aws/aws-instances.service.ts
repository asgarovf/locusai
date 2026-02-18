import {
  type AwsCredentials,
  InstanceAction,
  InstanceStatus,
  type ProvisionAwsInstance,
} from "@locusai/shared";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AwsInstance } from "@/entities/aws-instance.entity";
import { AwsCredentialsService } from "./aws-credentials.service";
import { AwsEc2Service } from "./aws-ec2.service";

const DEFAULT_AMI_ID = "ami-0c02fb55956c7d316";
const POLL_INTERVAL_MS = 30_000;
const MAX_POLL_ATTEMPTS = 10;

@Injectable()
export class AwsInstancesService {
  private readonly logger = new Logger(AwsInstancesService.name);

  constructor(
    @InjectRepository(AwsInstance)
    private readonly instanceRepository: Repository<AwsInstance>,
    private readonly awsCredentialsService: AwsCredentialsService,
    private readonly awsEc2Service: AwsEc2Service,
    private readonly configService: ConfigService
  ) {}

  async provisionInstance(workspaceId: string, dto: ProvisionAwsInstance) {
    let credentials: AwsCredentials;
    try {
      credentials = (await this.awsCredentialsService.getDecryptedCredentials(
        workspaceId
      )) as AwsCredentials;
    } catch {
      throw new BadRequestException("AWS credentials not configured");
    }

    const credential =
      await this.awsCredentialsService.getCredentials(workspaceId);

    const instance = this.instanceRepository.create({
      workspaceId,
      awsCredentialId: credential.id,
      status: InstanceStatus.PROVISIONING,
      instanceType: dto.instanceType,
      region: credentials.region,
      repoUrl: dto.repoUrl,
      githubToken: dto.githubToken,
      integrations: dto.integrations ?? [],
    });

    const saved = await this.instanceRepository.save(instance);

    const securityGroupName = `locus-instance-${saved.id}`;
    const userData = this.buildUserDataScript(dto);

    try {
      const securityGroupId = await this.awsEc2Service.createSecurityGroup(
        credentials,
        {
          groupName: securityGroupName,
          description: `Security group for Locus instance ${saved.id}`,
        }
      );

      saved.securityGroupId = securityGroupId;
      await this.instanceRepository.save(saved);

      const amiId =
        this.configService.get<string>("LOCUS_AMI_ID") ?? DEFAULT_AMI_ID;

      const ec2InstanceId = await this.awsEc2Service.launchInstance(
        credentials,
        {
          instanceType: dto.instanceType,
          amiId,
          securityGroupName,
          userData,
        }
      );

      saved.ec2InstanceId = ec2InstanceId;
      await this.instanceRepository.save(saved);

      this.pollInstanceStatus(
        saved.id,
        workspaceId,
        credentials,
        ec2InstanceId
      );

      this.logger.log(
        `Provisioning instance ${saved.id} (EC2: ${ec2InstanceId}) for workspace ${workspaceId}`
      );
    } catch (error) {
      saved.status = InstanceStatus.ERROR;
      saved.errorMessage =
        error instanceof Error ? error.message : "Unknown provisioning error";
      await this.instanceRepository.save(saved);
      this.logger.error(
        `Failed to provision instance ${saved.id}: ${saved.errorMessage}`
      );
    }

    return saved;
  }

  async getInstance(workspaceId: string, instanceId: string) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, workspaceId },
    });

    if (!instance) {
      throw new NotFoundException("Instance not found");
    }

    if (
      instance.ec2InstanceId &&
      instance.status !== InstanceStatus.TERMINATED
    ) {
      await this.refreshInstanceStatus(instance, workspaceId);
    }

    return instance;
  }

  async listInstances(workspaceId: string) {
    return this.instanceRepository.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  async performAction(
    workspaceId: string,
    instanceId: string,
    action: InstanceAction
  ) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, workspaceId },
    });

    if (!instance) {
      throw new NotFoundException("Instance not found");
    }

    if (!instance.ec2InstanceId) {
      throw new BadRequestException(
        "Instance has not been assigned an EC2 instance yet"
      );
    }

    let credentials: AwsCredentials;
    try {
      credentials = (await this.awsCredentialsService.getDecryptedCredentials(
        workspaceId
      )) as AwsCredentials;
    } catch {
      throw new BadRequestException("AWS credentials not configured");
    }

    switch (action) {
      case InstanceAction.START:
        await this.awsEc2Service.startInstance(
          credentials,
          instance.ec2InstanceId
        );
        instance.status = InstanceStatus.RUNNING;
        break;

      case InstanceAction.STOP:
        await this.awsEc2Service.stopInstance(
          credentials,
          instance.ec2InstanceId
        );
        instance.status = InstanceStatus.STOPPED;
        break;

      case InstanceAction.TERMINATE:
        await this.awsEc2Service.terminateInstance(
          credentials,
          instance.ec2InstanceId
        );
        instance.status = InstanceStatus.TERMINATED;

        if (instance.securityGroupId) {
          try {
            await this.awsEc2Service.deleteSecurityGroup(
              credentials,
              instance.securityGroupId
            );
          } catch (error) {
            this.logger.warn(
              `Failed to delete security group ${instance.securityGroupId}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
        break;
    }

    await this.instanceRepository.save(instance);
    this.logger.log(
      `Performed action ${action} on instance ${instanceId} (EC2: ${instance.ec2InstanceId})`
    );

    return instance;
  }

  async syncInstanceStatus(workspaceId: string, instanceId: string) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, workspaceId },
    });

    if (!instance) {
      throw new NotFoundException("Instance not found");
    }

    if (!instance.ec2InstanceId) {
      return instance;
    }

    await this.refreshInstanceStatus(instance, workspaceId);
    return instance;
  }

  private async refreshInstanceStatus(
    instance: AwsInstance,
    workspaceId: string
  ) {
    let credentials: AwsCredentials;
    try {
      credentials = (await this.awsCredentialsService.getDecryptedCredentials(
        workspaceId
      )) as AwsCredentials;
    } catch {
      return;
    }

    if (!instance.ec2InstanceId) {
      return;
    }

    try {
      const status = await this.awsEc2Service.describeInstance(
        credentials,
        instance.ec2InstanceId
      );

      const newStatus = this.mapEc2StateToStatus(status.state);
      if (newStatus) {
        instance.status = newStatus;
      }
      instance.publicIp = status.publicIp ?? null;

      if (instance.status === InstanceStatus.RUNNING && !instance.launchedAt) {
        instance.launchedAt = new Date();
      }

      await this.instanceRepository.save(instance);
    } catch (error) {
      this.logger.warn(
        `Failed to refresh status for instance ${instance.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private pollInstanceStatus(
    instanceId: string,
    workspaceId: string,
    credentials: AwsCredentials,
    ec2InstanceId: string,
    attempt = 0
  ) {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      this.logger.warn(
        `Polling timed out for instance ${instanceId} after ${MAX_POLL_ATTEMPTS} attempts`
      );
      return;
    }

    setTimeout(async () => {
      try {
        const instance = await this.instanceRepository.findOne({
          where: { id: instanceId },
        });

        if (
          !instance ||
          instance.status === InstanceStatus.TERMINATED ||
          instance.status === InstanceStatus.ERROR
        ) {
          return;
        }

        const status = await this.awsEc2Service.describeInstance(
          credentials,
          ec2InstanceId
        );

        const newStatus = this.mapEc2StateToStatus(status.state);
        if (newStatus) {
          instance.status = newStatus;
        }
        instance.publicIp = status.publicIp ?? null;

        if (
          instance.status === InstanceStatus.RUNNING &&
          !instance.launchedAt
        ) {
          instance.launchedAt = new Date();
        }

        await this.instanceRepository.save(instance);

        if (instance.status !== InstanceStatus.RUNNING) {
          this.pollInstanceStatus(
            instanceId,
            workspaceId,
            credentials,
            ec2InstanceId,
            attempt + 1
          );
        } else {
          this.logger.log(
            `Instance ${instanceId} is now RUNNING (IP: ${instance.publicIp})`
          );
        }
      } catch (error) {
        this.logger.warn(
          `Polling error for instance ${instanceId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        this.pollInstanceStatus(
          instanceId,
          workspaceId,
          credentials,
          ec2InstanceId,
          attempt + 1
        );
      }
    }, POLL_INTERVAL_MS);
  }

  async getSecurityRules(workspaceId: string, instanceId: string) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, workspaceId },
    });

    if (!instance) {
      throw new NotFoundException("Instance not found");
    }

    if (!instance.securityGroupId) {
      throw new BadRequestException("Instance has no security group");
    }

    let credentials: AwsCredentials;
    try {
      credentials = (await this.awsCredentialsService.getDecryptedCredentials(
        workspaceId
      )) as AwsCredentials;
    } catch {
      throw new BadRequestException("AWS credentials not configured");
    }

    return this.awsEc2Service.getSecurityGroupRules(
      credentials,
      instance.securityGroupId
    );
  }

  async updateSecurityRules(
    workspaceId: string,
    instanceId: string,
    allowedIps: string[]
  ) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, workspaceId },
    });

    if (!instance) {
      throw new NotFoundException("Instance not found");
    }

    if (!instance.securityGroupId) {
      throw new BadRequestException("Instance has no security group");
    }

    let credentials: AwsCredentials;
    try {
      credentials = (await this.awsCredentialsService.getDecryptedCredentials(
        workspaceId
      )) as AwsCredentials;
    } catch {
      throw new BadRequestException("AWS credentials not configured");
    }

    // If no IPs specified, default to open access
    const cidrs =
      allowedIps.length > 0 ? allowedIps : ["0.0.0.0/0"];

    const rules = cidrs.map((cidr) => ({
      port: 22,
      cidr,
      description: cidr === "0.0.0.0/0" ? "SSH access (open)" : "SSH access",
    }));

    await this.awsEc2Service.updateSecurityGroupIngress(
      credentials,
      instance.securityGroupId,
      rules
    );

    this.logger.log(
      `Updated security rules for instance ${instanceId}: ${cidrs.join(", ")}`
    );

    return this.awsEc2Service.getSecurityGroupRules(
      credentials,
      instance.securityGroupId
    );
  }

  private mapEc2StateToStatus(
    state: string | undefined
  ): InstanceStatus | null {
    switch (state) {
      case "running":
        return InstanceStatus.RUNNING;
      case "stopped":
        return InstanceStatus.STOPPED;
      case "terminated":
      case "shutting-down":
        return InstanceStatus.TERMINATED;
      case "pending":
        return InstanceStatus.PROVISIONING;
      default:
        return null;
    }
  }

  private buildUserDataScript(dto: ProvisionAwsInstance): string {
    const integrationSetup = (dto.integrations ?? [])
      .map(
        (integration) => `echo "Setting up integration: ${integration.name}"`
      )
      .join("\n");

    return `#!/bin/bash
set -euo pipefail

exec > /var/log/locus-setup.log 2>&1

echo "=== Locus Agent Setup ==="
echo "Started at: $(date)"

# Clone repository
cd /home/ubuntu
git clone https://${dto.githubToken}@${dto.repoUrl.replace("https://", "")} repo
cd repo

# Configure Locus agent
echo "Configuring Locus agent..."
if [ -f ".locus/config.json" ]; then
  echo "Found existing Locus configuration"
fi

# Setup integrations
${integrationSetup}

echo "=== Setup Complete ==="
echo "Completed at: $(date)"
`;
  }
}
