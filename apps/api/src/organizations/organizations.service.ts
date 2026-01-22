import { AddMember, MembershipRole } from "@locusai/shared";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Membership, Organization } from "@/entities";

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>
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
}
