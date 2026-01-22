import * as crypto from "node:crypto";
import { AddMember, MembershipRole } from "@locusai/shared";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKey, Membership, Organization } from "@/entities";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>
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

    await this.membershipRepository.remove(membership);
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
  private generateApiKey(): string {
    const randomBytes = crypto.randomBytes(32).toString("hex");
    return `lk_${randomBytes}`;
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
    name: string
  ): Promise<{ apiKey: ApiKey; key: string }> {
    // Verify org exists
    await this.findById(orgId);

    const key = this.generateApiKey();

    const apiKey = this.apiKeyRepository.create({
      organizationId: orgId,
      name,
      key,
      active: true,
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
