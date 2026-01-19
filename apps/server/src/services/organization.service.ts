/**
 * Organization Service
 */

import { generateUUID } from "../auth/password.js";
import type { Organization } from "../db/schema.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import type { MembershipRepository } from "../repositories/membership.repository.js";
import type { OrganizationRepository } from "../repositories/organization.repository.js";

export interface CreateOrganizationData {
  name: string;
  slug: string;
  avatarUrl?: string;
  ownerId: string;
}

export class OrganizationService {
  constructor(
    private orgRepo: OrganizationRepository,
    private membershipRepo: MembershipRepository
  ) {}

  /**
   * Check if a user is a member of an organization
   */
  async checkMembership(
    userId: string,
    orgId: string,
    requiredRoles: string[] = ["MEMBER", "ADMIN"],
    userRole?: string
  ): Promise<void> {
    // System ADMIN bypasses checks
    if (userRole === "ADMIN") return;

    const membership = await this.membershipRepo.findByUserAndOrg(
      userId,
      orgId
    );
    if (!membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenError(
        "Insufficient organization permissions or not a member"
      );
    }
  }

  /**
   * Create a new organization and assign the creator as ADMIN
   */
  async createOrganization(
    data: CreateOrganizationData
  ): Promise<Organization> {
    const existing = await this.orgRepo.findBySlug(data.slug);
    if (existing) {
      throw new ConflictError(
        `Organization with slug '${data.slug}' already exists`
      );
    }

    const orgId = generateUUID();
    const now = new Date();

    const org = await this.orgRepo.create({
      id: orgId,
      name: data.name,
      slug: data.slug,
      avatarUrl: data.avatarUrl,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial membership for the owner
    await this.membershipRepo.create({
      id: generateUUID(),
      userId: data.ownerId,
      orgId: orgId,
      role: "ADMIN",
      createdAt: now,
    });

    return org;
  }

  /**
   * Get an organization by ID
   */
  async getOrganization(id: string): Promise<Organization> {
    const org = await this.orgRepo.findById(id);
    if (!org) {
      throw new NotFoundError("Organization");
    }
    return org;
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    id: string,
    data: Partial<CreateOrganizationData>
  ): Promise<Organization> {
    const org = await this.orgRepo.update(id, data);
    if (!org) {
      throw new NotFoundError("Organization");
    }
    return org;
  }

  /**
   * Delete an organization
   */
  async deleteOrganization(id: string): Promise<void> {
    const deleted = await this.orgRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError("Organization");
    }
  }

  /**
   * Members management
   */
  async addMember(orgId: string, userId: string, role: string = "MEMBER") {
    // Check if membership already exists
    const existing = await this.membershipRepo.findByUserAndOrg(userId, orgId);
    if (existing) {
      throw new ConflictError("User is already a member of this organization");
    }

    return this.membershipRepo.create({
      id: generateUUID(),
      userId,
      orgId,
      role,
      createdAt: new Date(),
    });
  }

  async listMembers(orgId: string) {
    return this.membershipRepo.listByOrgId(orgId);
  }

  async removeMember(membershipId: string) {
    const deleted = await this.membershipRepo.delete(membershipId);
    if (!deleted) {
      throw new NotFoundError("Membership");
    }
  }
}
