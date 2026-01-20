/**
 * Workspace Service
 *
 * Handles workspace creation, membership management, and team invitations.
 */

import { and, eq } from "drizzle-orm";
import { generateUUID } from "../auth/password.js";
import type { DrizzleDB } from "../db/drizzle.js";
import { memberships, users, workspaces } from "../db/schema.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import type { EmailService } from "./email.service.js";

export class WorkspaceService {
  private db: DrizzleDB;
  private emailService?: EmailService;

  constructor(db: DrizzleDB, emailService?: EmailService) {
    this.db = db;
    this.emailService = emailService;
  }

  /**
   * Create a new workspace under an organization
   */
  async createWorkspace(
    orgId: string,
    userId: string,
    name: string
  ): Promise<{
    id: string;
    orgId: string;
    name: string;
    slug: string;
    createdAt: Date;
  }> {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const id = generateUUID();
    const now = new Date();

    await this.db.insert(workspaces).values({
      id,
      orgId,
      name,
      slug,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as owner
    await this.db.insert(memberships).values({
      id: generateUUID(),
      userId,
      orgId,
      role: "OWNER",
      createdAt: now,
    });

    return {
      id,
      orgId,
      name,
      slug,
      createdAt: now,
    };
  }

  /**
   * Get all workspaces a user has access to
   */
  async getWorkspacesByUser(userId: string): Promise<
    Array<{
      id: string;
      orgId: string;
      name: string;
      slug: string;
      role: string;
      createdAt: Date;
    }>
  > {
    const userMemberships = await this.db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        orgId: workspaces.orgId,
        role: memberships.role,
        createdAt: workspaces.createdAt,
      })
      .from(memberships)
      .innerJoin(workspaces, eq(memberships.orgId, workspaces.orgId))
      .where(eq(memberships.userId, userId));

    return userMemberships.map((m) => ({
      id: m.workspaceId,
      orgId: m.orgId,
      name: m.workspaceName,
      slug: m.workspaceSlug,
      role: m.role,
      createdAt: new Date(m.createdAt),
    }));
  }

  /**
   * Add a member to a workspace
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: "OWNER" | "ADMIN" | "MEMBER" = "MEMBER"
  ): Promise<void> {
    // Get workspace to find orgId
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Check if already a member
    const [existing] = await this.db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.orgId, workspace.orgId)
        )
      );

    if (existing) {
      throw new ConflictError("User is already a member of this organization");
    }

    const now = new Date();
    await this.db.insert(memberships).values({
      id: generateUUID(),
      userId,
      orgId: workspace.orgId,
      role,
      createdAt: now,
    });
  }

  /**
   * Invite a member to a workspace via email
   */
  async inviteMember(
    workspaceId: string,
    email: string,
    invitedBy: string,
    baseUrl: string
  ): Promise<void> {
    // Get workspace details
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    // Get inviter details
    const [inviter] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, invitedBy));

    if (!inviter) {
      throw new NotFoundError("Inviter not found");
    }

    // Generate invite URL (simplified - in production, use signed tokens)
    const inviteUrl = `${baseUrl}/invite?workspace=${workspaceId}&email=${encodeURIComponent(email)}`;

    // Send invitation email
    if (this.emailService) {
      await this.emailService.sendInvitationEmail(email, {
        inviterName: inviter.name,
        workspaceName: workspace.name,
        organizationName: workspace.name, // For now, use workspace name as org name
        inviteUrl,
      });
    }
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId: string): Promise<
    Array<{
      userId: string;
      email: string;
      name: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    // Get workspace to find orgId
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const members = await this.db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        role: memberships.role,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, workspace.orgId));

    return members.map((m) => ({
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      joinedAt: new Date(m.joinedAt),
    }));
  }

  /**
   * Remove a member from a workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    // Get workspace to find orgId
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    await this.db
      .delete(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.orgId, workspace.orgId)
        )
      );
  }
}
