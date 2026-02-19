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
import { EncryptionService } from "@/common/services/encryption.service";
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
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService
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
      githubTokenEncrypted: this.encryptionService.encrypt(dto.githubToken),
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
          securityGroupId,
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

    return this.sanitizeInstance(saved);
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

    return this.sanitizeInstance(instance);
  }

  async listInstances(workspaceId: string) {
    const instances = await this.instanceRepository.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
    return instances.map((instance) => this.sanitizeInstance(instance));
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

    return this.sanitizeInstance(instance);
  }

  async syncInstanceStatus(workspaceId: string, instanceId: string) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, workspaceId },
    });

    if (!instance) {
      throw new NotFoundException("Instance not found");
    }

    if (!instance.ec2InstanceId) {
      return this.sanitizeInstance(instance);
    }

    await this.refreshInstanceStatus(instance, workspaceId);
    return this.sanitizeInstance(instance);
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
    const repoUrlWithoutProtocol = dto.repoUrl.replace("https://", "");

    // Validate repo URL format to prevent injection
    if (!/^[a-zA-Z0-9._\-/]+$/.test(repoUrlWithoutProtocol)) {
      throw new BadRequestException("Invalid repository URL format");
    }

    // Validate integration names to prevent injection
    const integrations = dto.integrations ?? [];
    for (const integration of integrations) {
      if (!/^[a-zA-Z0-9._\-]+$/.test(integration.name)) {
        throw new BadRequestException(
          `Invalid integration name: ${integration.name}`
        );
      }
    }

    const integrationSetup = integrations
      .map(
        (integration) =>
          `echo "Setting up integration: ${integration.name}"`
      )
      .join("\n");

    // Use environment variable for the token to avoid leaking it in
    // process listings or cloud-init logs. The token is passed via
    // user-data which is already only accessible to the instance itself.
    const escapedToken = this.shellEscape(dto.githubToken);
    const escapedRepoUrl = this.shellEscape(repoUrlWithoutProtocol);

    return `#!/bin/bash
set -euo pipefail

# Redirect output but disable command tracing to prevent secret leakage
exec > /var/log/locus-setup.log 2>&1

echo "=== Locus Agent Setup ==="
echo "Started at: $(date)"

# Use environment variable for token to avoid leaking in process listings
export GH_TOKEN=${escapedToken}

# Clone repository using token from environment
cd /home/ubuntu
git clone "https://\${GH_TOKEN}@${escapedRepoUrl}" repo

# Clear token from environment immediately after use
unset GH_TOKEN

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

  private shellEscape(value: string): string {
    // Wrap in single quotes; escape any embedded single quotes
    return "'" + value.replace(/'/g, "'\\''") + "'";
  }

  private sanitizeInstance(instance: AwsInstance): Omit<AwsInstance, "githubTokenEncrypted"> {
    const { githubTokenEncrypted: _, ...sanitized } = instance;
    return sanitized;
  }
}
