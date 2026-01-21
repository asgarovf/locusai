import { EventType, SprintStatus } from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sprint } from "@/entities/sprint.entity";
import { EventsService } from "@/events/events.service";

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    private readonly eventsService: EventsService
  ) {}

  async findAll(workspaceId: string): Promise<Sprint[]> {
    return this.sprintRepository.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({ where: { id } });
    if (!sprint) {
      throw new NotFoundException("Sprint not found");
    }
    return sprint;
  }

  async create(data: {
    name: string;
    workspaceId: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<Sprint> {
    const sprint = this.sprintRepository.create({
      name: data.name,
      workspaceId: data.workspaceId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: SprintStatus.PLANNED,
    });

    const saved = await this.sprintRepository.save(sprint);

    await this.eventsService.logEvent({
      workspaceId: data.workspaceId,
      userId: data.userId,
      type: EventType.SPRINT_CREATED,
      payload: { name: data.name, sprintId: saved.id },
    });

    return saved;
  }

  async update(
    id: string,
    updates: Partial<Sprint>,
    userId?: string
  ): Promise<Sprint> {
    const sprint = await this.findById(id);
    const oldStatus = sprint.status;

    Object.assign(sprint, updates);
    const saved = await this.sprintRepository.save(sprint);

    if (updates.status && updates.status !== oldStatus) {
      await this.eventsService.logEvent({
        workspaceId: saved.workspaceId,
        userId,
        type: EventType.SPRINT_STATUS_CHANGED,
        payload: {
          name: saved.name,
          sprintId: id,
          oldStatus,
          newStatus: updates.status,
        },
      });
    }

    return saved;
  }

  async findActive(workspaceId: string): Promise<Sprint | null> {
    return this.sprintRepository.findOne({
      where: { workspaceId, status: SprintStatus.ACTIVE },
    });
  }

  async startSprint(id: string, userId?: string): Promise<Sprint> {
    const sprint = await this.findById(id);

    // Deactivate current active sprint in this workspace
    const activeSprint = await this.findActive(sprint.workspaceId);
    if (activeSprint) {
      activeSprint.status = SprintStatus.COMPLETED;
      await this.sprintRepository.save(activeSprint);
    }

    sprint.status = SprintStatus.ACTIVE;
    sprint.startDate = sprint.startDate || new Date();
    const saved = await this.sprintRepository.save(sprint);

    await this.eventsService.logEvent({
      workspaceId: saved.workspaceId,
      userId,
      type: EventType.SPRINT_STATUS_CHANGED,
      payload: {
        name: saved.name,
        sprintId: id,
        oldStatus: SprintStatus.PLANNED,
        newStatus: SprintStatus.ACTIVE,
      },
    });

    return saved;
  }

  async completeSprint(id: string, userId?: string): Promise<Sprint> {
    const sprint = await this.findById(id);
    const oldStatus = sprint.status;

    sprint.status = SprintStatus.COMPLETED;
    sprint.endDate = sprint.endDate || new Date();
    const saved = await this.sprintRepository.save(sprint);

    await this.eventsService.logEvent({
      workspaceId: saved.workspaceId,
      userId,
      type: EventType.SPRINT_STATUS_CHANGED,
      payload: {
        name: saved.name,
        sprintId: id,
        oldStatus,
        newStatus: SprintStatus.COMPLETED,
      },
    });

    return saved;
  }

  async delete(id: string): Promise<void> {
    const sprint = await this.findById(id);
    await this.sprintRepository.remove(sprint);
  }
}
