import { EventType, SprintStatus, TaskStatus } from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event, Task } from "@/entities";
import { Sprint } from "@/entities/sprint.entity";
import { EventsService } from "@/events/events.service";
import { TasksService } from "@/tasks/tasks.service";

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    private readonly tasksService: TasksService,
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
    taskIds?: string[];
  }): Promise<Sprint> {
    const sprint = this.sprintRepository.create({
      name: data.name,
      workspaceId: data.workspaceId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: SprintStatus.PLANNED,
    });

    const saved = await this.sprintRepository.save(sprint);

    if (data.taskIds && data.taskIds.length > 0) {
      await this.tasksService.batchUpdate(data.taskIds, data.workspaceId, {
        sprintId: saved.id,
      });
    }

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

    // Fetch all tasks in this sprint
    const tasks = await this.sprintRepository.manager.getRepository(Task).find({
      where: { sprintId: id },
    });

    // Prepare bulk updates
    const tasksToUpdate: Task[] = [];
    const eventPromises: Promise<Event>[] = [];

    // Process each task and collect updates
    for (const task of tasks) {
      const oldTaskStatus = task.status;
      let taskUpdated = false;

      if (
        task.status === TaskStatus.IN_REVIEW ||
        task.status === TaskStatus.PR_OPEN
      ) {
        // Auto-approve tasks waiting for review
        task.status = TaskStatus.DONE;
        taskUpdated = true;
      } else if (task.status === TaskStatus.IN_PROGRESS) {
        // Move in-progress tasks to backlog and unassign
        task.status = TaskStatus.BACKLOG;
        task.sprintId = null;
        task.assignedTo = null;
        taskUpdated = true;
      }

      if (taskUpdated) {
        tasksToUpdate.push(task);

        // Prepare event logging (to be executed in parallel later)
        eventPromises.push(
          this.eventsService.logEvent({
            workspaceId: saved.workspaceId,
            taskId: task.id,
            userId,
            type: EventType.STATUS_CHANGED,
            payload: {
              title: task.title,
              oldStatus: oldTaskStatus,
              newStatus: task.status,
              reason: "Sprint completed",
            },
          })
        );
      }
    }

    // Execute bulk operations in parallel
    await Promise.all([
      // Bulk save all updated tasks in a single operation
      tasksToUpdate.length > 0
        ? this.sprintRepository.manager.getRepository(Task).save(tasksToUpdate)
        : Promise.resolve(),
      // Log all events in parallel
      ...eventPromises,
      // Log sprint status change event
      this.eventsService.logEvent({
        workspaceId: saved.workspaceId,
        userId,
        type: EventType.SPRINT_STATUS_CHANGED,
        payload: {
          name: saved.name,
          sprintId: id,
          oldStatus,
          newStatus: SprintStatus.COMPLETED,
        },
      }),
    ]);

    return saved;
  }

  async delete(id: string, userId?: string): Promise<void> {
    const sprint = await this.findById(id);
    await this.eventsService.logEvent({
      workspaceId: sprint.workspaceId,
      userId,
      type: EventType.SPRINT_DELETED,
      payload: { name: sprint.name, sprintId: id },
    });
    await this.sprintRepository.remove(sprint);
  }
}
