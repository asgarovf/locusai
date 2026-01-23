import { ChecklistItem, MembershipRole } from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    private readonly eventsService: EventsService
  ) {}

  async findById(id: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      select: [
        "id",
        "orgId",
        "name",
        "defaultChecklist",
        "createdAt",
        "updatedAt",
      ],
      relations: ["organization"],
    });
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }
    return workspace;
  }

  async findByUser(userId: string): Promise<Workspace[]> {
    // This is a bit simplified, usually we'd join with memberships
    // But since workspaces belong to orgs and users have memberships in orgs:
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
  ): Promise<Workspace> {
    const workspace = await this.findById(id);
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
    const workspace = await this.findById(id);
    await this.workspaceRepository.remove(workspace);
  }

  async getStats(id: string) {
    const workspace = await this.findById(id);

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
}
