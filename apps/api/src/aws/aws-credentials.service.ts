import {
  type AwsCredentials,
  InstanceStatus,
  SaveAwsCredentials,
} from "@locusai/shared";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { EncryptionService } from "@/common/services/encryption.service";
import { AwsCredential } from "@/entities/aws-credential.entity";
import { AwsInstance } from "@/entities/aws-instance.entity";
import { AwsEc2Service } from "./aws-ec2.service";

@Injectable()
export class AwsCredentialsService {
  private readonly logger = new Logger(AwsCredentialsService.name);

  constructor(
    @InjectRepository(AwsCredential)
    private readonly credentialRepository: Repository<AwsCredential>,
    @InjectRepository(AwsInstance)
    private readonly instanceRepository: Repository<AwsInstance>,
    private readonly encryptionService: EncryptionService,
    private readonly awsEc2Service: AwsEc2Service
  ) {}

  async saveCredentials(workspaceId: string, dto: SaveAwsCredentials) {
    const valid = await this.awsEc2Service.validateCredentials({
      accessKeyId: dto.accessKeyId,
      secretAccessKey: dto.secretAccessKey,
      region: dto.region,
    } as AwsCredentials);

    if (!valid) {
      throw new BadRequestException(
        "Invalid AWS credentials. Please verify your access key and secret."
      );
    }

    const accessKeyIdEncrypted = this.encryptionService.encrypt(
      dto.accessKeyId
    );
    const secretAccessKeyEncrypted = this.encryptionService.encrypt(
      dto.secretAccessKey
    );

    const existing = await this.credentialRepository.findOne({
      where: { workspaceId },
    });

    if (existing) {
      existing.accessKeyIdEncrypted = accessKeyIdEncrypted;
      existing.secretAccessKeyEncrypted = secretAccessKeyEncrypted;
      existing.region = dto.region;
      const saved = await this.credentialRepository.save(existing);
      this.logger.log(`Updated AWS credentials for workspace ${workspaceId}`);
      return { id: saved.id, region: saved.region, createdAt: saved.createdAt };
    }

    const credential = this.credentialRepository.create({
      workspaceId,
      accessKeyIdEncrypted,
      secretAccessKeyEncrypted,
      region: dto.region,
    });

    const saved = await this.credentialRepository.save(credential);
    this.logger.log(`Saved new AWS credentials for workspace ${workspaceId}`);
    return { id: saved.id, region: saved.region, createdAt: saved.createdAt };
  }

  async getCredentials(workspaceId: string) {
    const credential = await this.credentialRepository.findOne({
      where: { workspaceId },
    });

    if (!credential) {
      throw new NotFoundException(
        "No AWS credentials found for this workspace."
      );
    }

    const decryptedAccessKeyId = this.encryptionService.decrypt(
      credential.accessKeyIdEncrypted
    );
    const maskedAccessKeyId = `****${decryptedAccessKeyId.slice(-4)}`;

    return {
      id: credential.id,
      accessKeyId: maskedAccessKeyId,
      region: credential.region,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  async getDecryptedCredentials(workspaceId: string) {
    const credential = await this.credentialRepository.findOne({
      where: { workspaceId },
    });

    if (!credential) {
      throw new NotFoundException(
        "No AWS credentials found for this workspace."
      );
    }

    return {
      accessKeyId: this.encryptionService.decrypt(
        credential.accessKeyIdEncrypted
      ),
      secretAccessKey: this.encryptionService.decrypt(
        credential.secretAccessKeyEncrypted
      ),
      region: credential.region,
    };
  }

  async deleteCredentials(workspaceId: string) {
    const credential = await this.credentialRepository.findOne({
      where: { workspaceId },
    });

    if (!credential) {
      throw new NotFoundException(
        "No AWS credentials found for this workspace."
      );
    }

    const activeInstances = await this.instanceRepository.count({
      where: {
        awsCredentialId: credential.id,
        status: In([
          InstanceStatus.PROVISIONING,
          InstanceStatus.RUNNING,
          InstanceStatus.STOPPED,
        ]),
      },
    });

    if (activeInstances > 0) {
      throw new ConflictException(
        "Cannot delete credentials while active instances are using them. Terminate all instances first."
      );
    }

    await this.credentialRepository.remove(credential);
    this.logger.log(`Deleted AWS credentials for workspace ${workspaceId}`);
  }
}
