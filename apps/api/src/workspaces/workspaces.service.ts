import { ChecklistItem, MembershipRole } from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKey } from "@/entities/api-key.entity";
import { Membership } from "@/entities/membership.entity";
import { Organization } from "@/entities/organization.entity";
import { Task } from "@/entities/task.entity";
import { Workspace } from "@/entities/workspace.entity";
import { EventsService } from "@/events/events.service";

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
    private readonly eventsService: EventsService
  ) {}

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

  async findById(id: string): Promise<Workspace> {
    return this.findByIdRaw(id);
  }

  async findByUser(userId: string): Promise<Workspace[]> {
    return this.workspaceRepository
      .createQueryBuilder("workspace")
      .innerJoin("memberships", "m", "m.org_id = workspace.org_id")
      .where("m.user_id = :userId", { userId })
      .getMany();
  }

  async findByOrg(orgId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { orgId },
    });
  }

  async create(orgId: string, name: string): Promise<Workspace> {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const workspace = this.workspaceRepository.create({
      orgId,
      name,
    });

    return this.workspaceRepository.save(workspace);
  }

  async createWithAutoOrg(userId: string, name: string): Promise<Workspace> {
    const userMemberships = await this.membershipRepository.find({
      where: { userId },
      relations: ["organization"],
    });

    let org = userMemberships[0]?.organization;

    if (!org) {
      org = this.orgRepository.create({
        name,
      });
      org = await this.orgRepository.save(org);

      const membership = this.membershipRepository.create({
        orgId: org.id,
        userId,
        role: MembershipRole.OWNER,
      });
      await this.membershipRepository.save(membership);
    }

    return this.create(org.id, name);
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      defaultChecklist?: Array<Partial<ChecklistItem>>;
    }
  ): Promise<Workspace> {
    const workspace = await this.findByIdRaw(id);
    if (updateData.name) {
      workspace.name = updateData.name;
    }
    if (updateData.defaultChecklist) {
      // biome-ignore lint/suspicious/noExplicitAny: DTO has partial items while entity requires complete items
      workspace.defaultChecklist = updateData.defaultChecklist as any;
    }
    return this.workspaceRepository.save(workspace);
  }

  async delete(id: string): Promise<void> {
    const workspace = await this.findByIdRaw(id);
    await this.workspaceRepository.remove(workspace);
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
    return this.apiKeyRepository.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Create a new API key for a workspace
   */
  async createApiKey(workspaceId: string, name: string) {
    const workspace = await this.findByIdRaw(workspaceId);

    const { key, hash, prefix } = this.generateApiKey();

    const apiKey = this.apiKeyRepository.create({
      workspaceId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      active: true,
    });

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
