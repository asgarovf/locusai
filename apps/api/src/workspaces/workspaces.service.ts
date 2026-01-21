import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Membership, Organization, Task, Workspace } from "@/entities";
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
      select: ["id", "orgId", "name", "slug", "createdAt", "updatedAt"],
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

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existing = await this.workspaceRepository.findOne({
      where: { orgId, slug },
    });

    if (existing) {
      throw new ConflictException(
        "A workspace with this name already exists in the organization"
      );
    }

    const workspace = this.workspaceRepository.create({
      orgId,
      name,
      slug,
    });

    return this.workspaceRepository.save(workspace);
  }

  async update(id: string, name: string): Promise<Workspace> {
    const workspace = await this.findById(id);
    workspace.name = name;
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
