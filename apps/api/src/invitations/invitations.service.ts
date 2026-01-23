import * as crypto from "node:crypto";
import { MembershipRole, UserRole } from "@locusai/shared";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "@/common/services/email.service";
import { Invitation } from "@/entities/invitation.entity";
import { Membership } from "@/entities/membership.entity";
import { Organization } from "@/entities/organization.entity";
import { User } from "@/entities/user.entity";

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService
  ) {}

  async create(data: {
    email: string;
    orgId: string;
    role: MembershipRole;
    invitedByUserId: string;
  }): Promise<Invitation> {
    const org = await this.orgRepository.findOne({ where: { id: data.orgId } });
    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const inviter = await this.userRepository.findOne({
      where: { id: data.invitedByUserId },
    });
    if (!inviter) {
      throw new NotFoundException("Inviter not found");
    }

    // Check if user is already a member
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });
    if (existingUser) {
      const membership = await this.membershipRepository.findOne({
        where: { orgId: data.orgId, userId: existingUser.id },
      });
      if (membership) {
        throw new ConflictException(
          "User is already a member of this organization"
        );
      }
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = this.invitationRepository.create({
      email: data.email,
      orgId: data.orgId,
      role: data.role,
      invitedByUserId: data.invitedByUserId,
      token,
      expiresAt,
    });

    const saved = await this.invitationRepository.save(invitation);

    // Send email
    await this.emailService.sendInvitationEmail(data.email, {
      inviterName: inviter.name,
      organizationName: org.name,
      token,
    });

    return saved;
  }

  async findByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ["organization", "invitedBy"],
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException("Invitation already accepted");
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("Invitation expired");
    }

    return invitation;
  }

  async accept(token: string, name: string): Promise<Membership> {
    const invitation = await this.findByToken(token);

    // Check if user exists
    let user = await this.userRepository.findOne({
      where: { email: invitation.email },
    });

    // Create user if doesn't exist
    if (!user) {
      if (!name) {
        throw new BadRequestException("Name is required for new users");
      }
      user = this.userRepository.create({
        email: invitation.email,
        name,
        role: UserRole.USER,
        onboardingCompleted: true,
        emailVerified: true,
      });
      user = await this.userRepository.save(user);
    }

    // Check if user is already a member
    const existingMembership = await this.membershipRepository.findOne({
      where: { orgId: invitation.orgId, userId: user.id },
    });

    let savedMembership: Membership;

    if (existingMembership) {
      // User is already a member, just use the existing membership
      savedMembership = existingMembership;
    } else {
      // Create new membership
      const membership = this.membershipRepository.create({
        orgId: invitation.orgId,
        userId: user.id,
        role: invitation.role,
      });
      savedMembership = await this.membershipRepository.save(membership);
    }

    // Mark invitation as accepted
    invitation.acceptedAt = new Date();
    await this.invitationRepository.save(invitation);

    return savedMembership;
  }

  async listByOrg(orgId: string): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: { orgId, acceptedAt: null },
      order: { createdAt: "DESC" },
    });
  }

  async revoke(id: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
    });
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }
    await this.invitationRepository.remove(invitation);
  }
}
