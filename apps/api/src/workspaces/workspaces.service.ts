import {
  ChecklistItem,
  ManifestStatusResponse,
  MembershipRole,
  ProjectManifestType,
  WorkspaceWithManifestInfo,
} from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKey } from "@/entities/api-key.entity";
import { Membership } from "@/entities/membership.entity";
import { Organization } from "@/entities/organization.entity";
import { Task } from "@/entities/task.entity";
import { Workspace } from "@/entities/workspace.entity";
import { EventsService } from "@/events/events.service";
import { ManifestValidatorService } from "./manifest-validator.service";

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    private readonly eventsService: EventsService,
    private readonly manifestValidator: ManifestValidatorService
  ) {}

  /**
   * Enriches a workspace entity with manifest completion info.
   */
  private enrichWithManifestInfo(
    workspace: Workspace
  ): WorkspaceWithManifestInfo {
    const completion = this.manifestValidator.calculateCompletion(
      workspace.projectManifest as Partial<ProjectManifestType>
    );

    return {
      ...workspace,
      isManifestComplete: completion.isManifestComplete,
      manifestCompletionPercentage: completion.manifestCompletionPercentage,
    };
  }

  /**
   * Enriches multiple workspace entities with manifest completion info.
   */
  private enrichMultipleWithManifestInfo(
    workspaces: Workspace[]
  ): WorkspaceWithManifestInfo[] {
    return workspaces.map((ws) => this.enrichWithManifestInfo(ws));
  }

  /**
   * Find workspace by ID - returns raw entity for internal use.
   */
  async findByIdRaw(id: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: ["organization"],
    });
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }
    return workspace;
  }

  async findById(id: string): Promise<WorkspaceWithManifestInfo> {
    const workspace = await this.findByIdRaw(id);
    return this.enrichWithManifestInfo(workspace);
  }

  async findByUser(userId: string): Promise<WorkspaceWithManifestInfo[]> {
    // This is a bit simplified, usually we'd join with memberships
    // But since workspaces belong to orgs and users have memberships in orgs:
    const workspaces = await this.workspaceRepository
      .createQueryBuilder("workspace")
      .innerJoin("memberships", "m", "m.org_id = workspace.org_id")
      .where("m.user_id = :userId", { userId })
      .getMany();
    return this.enrichMultipleWithManifestInfo(workspaces);
  }

  async findByOrg(orgId: string): Promise<WorkspaceWithManifestInfo[]> {
    const workspaces = await this.workspaceRepository.find({
      where: { orgId },
    });
    return this.enrichMultipleWithManifestInfo(workspaces);
  }

  /**
   * Find workspace by ID with manifest validation and auto-repair.
   * This method loads the full workspace including projectManifest,
   * validates it against the schema, and repairs any missing or corrupted fields.
   */
  async findByIdWithManifest(id: string): Promise<WorkspaceWithManifestInfo> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    // Validate and repair manifest
    const validationResult = this.manifestValidator.validateAndRepair(
      workspace.projectManifest as Partial<ProjectManifestType>,
      workspace.id
    );

    // If manifest was repaired, persist the changes
    if (validationResult.wasRepaired && validationResult.manifest) {
      workspace.projectManifest = validationResult.manifest;
      await this.workspaceRepository.save(workspace);
    }

    return this.enrichWithManifestInfo(workspace);
  }

  /**
   * Validates and repairs the manifest for a given workspace.
   * Returns the validation result without fetching the workspace.
   */
  async validateWorkspaceManifest(
    workspace: Workspace
  ): Promise<{ wasRepaired: boolean; repairedFields: string[] }> {
    const validationResult = this.manifestValidator.validateAndRepair(
      workspace.projectManifest as Partial<ProjectManifestType>,
      workspace.id
    );

    if (validationResult.wasRepaired && validationResult.manifest) {
      workspace.projectManifest = validationResult.manifest;
      await this.workspaceRepository.save(workspace);
    }

    return {
      wasRepaired: validationResult.wasRepaired,
      repairedFields: validationResult.repairedFields,
    };
  }

  async create(
    orgId: string,
    name: string
  ): Promise<WorkspaceWithManifestInfo> {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const workspace = this.workspaceRepository.create({
      orgId,
      name,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);
    return this.enrichWithManifestInfo(savedWorkspace);
  }

  async createWithAutoOrg(
    userId: string,
    name: string
  ): Promise<WorkspaceWithManifestInfo> {
    // Get user's current organization or create one if they don't have one
    const userMemberships = await this.membershipRepository.find({
      where: { userId },
      relations: ["organization"],
    });

    let org = userMemberships[0]?.organization;

    if (!org) {
      // User has no organization, create one
      org = this.orgRepository.create({
        name,
      });
      org = await this.orgRepository.save(org);

      // Add user as owner of the organization
      const membership = this.membershipRepository.create({
        orgId: org.id,
        userId,
        role: MembershipRole.OWNER,
      });
      await this.membershipRepository.save(membership);
    }

    // Now create the workspace
    return this.create(org.id, name);
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      defaultChecklist?: Array<Partial<ChecklistItem>>;
    }
  ): Promise<WorkspaceWithManifestInfo> {
    const workspace = await this.findByIdRaw(id);
    if (updateData.name) {
      workspace.name = updateData.name;
    }
    if (updateData.defaultChecklist) {
      // biome-ignore lint/suspicious/noExplicitAny: DTO has partial items while entity requires complete items
      workspace.defaultChecklist = updateData.defaultChecklist as any;
    }
    const savedWorkspace = await this.workspaceRepository.save(workspace);
    return this.enrichWithManifestInfo(savedWorkspace);
  }

  async delete(id: string): Promise<void> {
    const workspace = await this.findByIdRaw(id);
    await this.workspaceRepository.remove(workspace);
  }

  /**
   * Get detailed manifest completion status for a workspace.
   * Returns completion percentage and missing fields.
   */
  async getManifestStatus(
    workspaceId: string
  ): Promise<ManifestStatusResponse> {
    const workspace = await this.findByIdRaw(workspaceId);

    const completion = this.manifestValidator.calculateCompletion(
      workspace.projectManifest as Partial<ProjectManifestType>
    );

    // Extract AI-calculated completeness score from manifest
    const manifest =
      workspace.projectManifest as Partial<ProjectManifestType> | null;
    const completenessScore = manifest?.completenessScore ?? null;

    return {
      isComplete: completion.isManifestComplete,
      percentage: completion.manifestCompletionPercentage,
      missingFields: completion.missingFields,
      filledFields: completion.filledFields,
      completenessScore,
    };
  }

  async getStats(id: string) {
    const workspace = await this.findByIdRaw(id);

    const taskCounts: Record<string, number> = {};
    const tasks = await this.taskRepository.find({
      where: { workspaceId: id },
    });

    for (const task of tasks) {
      taskCounts[task.status] = (taskCounts[task.status] || 0) + 1;
    }

    const memberCount = await this.membershipRepository.count({
      where: { orgId: workspace.orgId },
    });

    return {
      workspaceName: workspace.name,
      taskCounts,
      memberCount,
    };
  }

  async getActivity(id: string, limit = 50) {
    return this.eventsService.getWorkspaceActivity(id, limit);
  }

  // ============================================================================
  // API Key Management
  // ============================================================================

  /**
   * Generate a secure API key with prefix
   */
  private generateApiKey(): { key: string; hash: string; prefix: string } {
    // Dynamically import crypto to avoid issues if not available in some envs (schema only)
    // but here we are in Node environment
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require("node:crypto");
    const randomBytes = crypto.randomBytes(32).toString("hex");
    const key = `lk_${randomBytes}`;
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const prefix = key.slice(0, 8); // "lk_XXXX"
    return { key, hash, prefix };
  }

  /**
   * List all API keys for a workspace
   */
  async listApiKeys(workspaceId: string) {
    // Import ApiKey entity (using any to avoid circular dep issues in service if any, but we injected it?)
    // Actually we need to inject ApiKey repository
    // We haven't injected it yet in constructor, will do that in next step
    // For now assuming we will fix constructor
    return this.apiKeyRepository.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Create a new API key for a workspace
   */
  async createApiKey(workspaceId: string, name: string) {
    // Verify workspace exists and get it
    const workspace = await this.findByIdRaw(workspaceId);

    const { key, hash, prefix } = this.generateApiKey();

    const apiKey = this.apiKeyRepository.create({
      workspaceId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      active: true,
    });

    // Resolve orgId
    if (workspace.orgId) {
      apiKey.organizationId = workspace.orgId;
    }

    const saved = await this.apiKeyRepository.save(apiKey);

    return { apiKey: saved, key };
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(workspaceId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, workspaceId },
    });

    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }

    await this.apiKeyRepository.remove(apiKey);
  }
}
