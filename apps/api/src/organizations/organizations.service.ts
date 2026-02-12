import * as crypto from "node:crypto";
import { AddMember, MembershipRole } from "@locusai/shared";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ApiKey, Membership, Organization, User } from "@/entities";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource
  ) {}

  async findById(id: string): Promise<Organization> {
    const org = await this.orgRepository.findOne({
      where: { id },
      relations: ["workspaces"],
    });
    if (!org) {
      throw new NotFoundException("Organization not found");
    }
    return org;
  }

  async findByUser(userId: string): Promise<Organization[]> {
    const memberships = await this.membershipRepository.find({
      where: { userId },
      relations: ["organization"],
    });
    return memberships.map((m) => m.organization);
  }

  async getMembers(orgId: string): Promise<Membership[]> {
    return this.membershipRepository.find({
      where: { orgId },
      relations: ["user"],
    });
  }

  async addMember(orgId: string, data: AddMember): Promise<Membership> {
    const existing = await this.membershipRepository.findOne({
      where: { orgId, userId: data.userId },
    });

    if (existing) {
      throw new ConflictException(
        "User is already a member of this organization"
      );
    }

    const membership = this.membershipRepository.create({
      orgId,
      userId: data.userId,
      role: data.role as MembershipRole,
    });

    return this.membershipRepository.save(membership);
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepository.findOne({
      where: { orgId, userId },
    });

    if (!membership) {
      throw new NotFoundException("Membership not found");
    }

    // Don't allow removing the last owner
    if (membership.role === MembershipRole.OWNER) {
      const owners = await this.membershipRepository.count({
        where: { orgId, role: MembershipRole.OWNER },
      });
      if (owners <= 1) {
        throw new ConflictException(
          "Cannot remove the last owner of the organization"
        );
      }
    }

    // For now, we are enforcing 1 User = 1 Organization policy.
    // When a user is removed from an organization, they are deleted entirely.
    // This simplifies the frontend flow as they would need to sign up again anyway.

    // Cascading delete on User entity will update:
    // - Memberships (CASCADE)
    // - Events (CASCADE)
    // - Tasks/Comments (No FK constraint, just ID reference - will remain as history)

    await this.userRepository.delete(userId);
  }

  async delete(orgId: string): Promise<void> {
    const org = await this.orgRepository.findOne({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Delete all memberships for this organization
    await this.membershipRepository.delete({ orgId });

    // Delete the organization
    await this.orgRepository.remove(org);
  }

  // ============================================================================
  // API Key Management
  // ============================================================================

  /**
   * Generate a secure API key with prefix
   */
  private generateApiKey(): { key: string; hash: string; prefix: string } {
    const randomBytes = crypto.randomBytes(32).toString("hex");
    const key = `lk_${randomBytes}`;
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const prefix = key.slice(0, 8); // "lk_XXXX"
    return { key, hash, prefix };
  }

  /**
   * List all API keys for an organization (without exposing full key)
   */
  async listApiKeys(orgId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Create a new API key for an organization
   * Returns the full key only once (on creation)
   */
  async createApiKey(
    orgId: string,
    name: string,
    expiresInDays?: number
  ): Promise<{ apiKey: ApiKey; key: string }> {
    // Verify org exists
    await this.findById(orgId);

    const { key, hash, prefix } = this.generateApiKey();

    const apiKey = this.apiKeyRepository.create({
      organizationId: orgId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      active: true,
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null,
    });

    const saved = await this.apiKeyRepository.save(apiKey);

    // Return the full key only on creation
    return { apiKey: saved, key };
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(orgId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, organizationId: orgId },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    await this.apiKeyRepository.remove(apiKey);
  }

  /**
   * Rotate an API key: deactivate the old key and create a new one in a single transaction
   */
  async rotateApiKey(
    orgId: string,
    keyId: string,
    expiresInDays?: number
  ): Promise<{ apiKey: ApiKey; key: string }> {
    const oldKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, organizationId: orgId },
    });

    if (!oldKey) {
      throw new NotFoundException("API key not found");
    }

    const { key, hash, prefix } = this.generateApiKey();

    return this.dataSource.transaction(async (manager) => {
      oldKey.active = false;
      await manager.save(oldKey);

      const newApiKey = manager.create(ApiKey, {
        organizationId: orgId,
        workspaceId: oldKey.workspaceId,
        name: oldKey.name,
        keyHash: hash,
        keyPrefix: prefix,
        active: true,
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : oldKey.expiresAt,
      });

      const saved = await manager.save(newApiKey);
      return { apiKey: saved, key };
    });
  }

  /**
   * Toggle API key active status
   */
  async toggleApiKeyStatus(
    orgId: string,
    keyId: string,
    active: boolean
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, organizationId: orgId },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    apiKey.active = active;
    return this.apiKeyRepository.save(apiKey);
  }
}
