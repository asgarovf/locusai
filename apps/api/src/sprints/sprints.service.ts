import { EventType, SprintStatus } from "@locusai/shared";
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiService } from "@/ai/ai.service";
import { Task } from "@/entities";
import { Sprint } from "@/entities/sprint.entity";
import { EventsService } from "@/events/events.service";
import { TasksService } from "@/tasks/tasks.service";

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    private readonly tasksService: TasksService,
    private readonly eventsService: EventsService,

    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService
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

  async planSprintWithAi(
    sprintId: string,
    workspaceId: string
  ): Promise<Sprint> {
    const sprint = await this.findById(sprintId);
    if (sprint.workspaceId !== workspaceId) {
      throw new NotFoundException("Sprint not found in this workspace");
    }

    // Get all tasks in the sprint
    const tasks = await this.sprintRepository.manager.getRepository(Task).find({
      where: { sprintId: sprintId },
    });

    if (tasks.length === 0) return sprint;

    // Check if planning is actually needed
    const latestTaskCreation = tasks.reduce((latest, task) => {
      const taskDate = new Date(task.createdAt);
      return taskDate > latest ? taskDate : latest;
    }, new Date(0));

    const mindmapDate = sprint.mindmapUpdatedAt
      ? new Date(sprint.mindmapUpdatedAt)
      : new Date(0);

    const needsPlanning =
      !sprint.mindmap ||
      sprint.mindmap.trim() === "" ||
      latestTaskCreation > mindmapDate ||
      tasks.length <= 1; // Always "plan" if 1 task to ensure mindmap exists? Or skip if 1?

    // Actually, according to worker logic: if (activeTasks.length <= 1) skip mindmap generation.
    // Let's refine: if tasks.length <= 1, we don't need AI to "plan" the order.
    if (tasks.length <= 1) return sprint;

    if (!needsPlanning) return sprint;

    // Use AI Agent to generate plan
    const agent = await this.aiService.getAgent(workspaceId);

    const taskList = tasks
      .map(
        (t) => `- [${t.id}] ${t.title}: ${t.description || "No description"}`
      )
      .join("\n");

    const prompt = `
      PLAN_SPRINT:
      Tasks to plan:
      ${taskList}
      
      Analyze dependencies and prioritize specific tasks.
      Return ONLY a JSON array of sorted task IDs.
    `;

    const response = await agent.handleMessage(prompt);

    // Parse Response
    let orderedIds: string[] = [];
    const jsonMatch = response.content.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        orderedIds = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("Failed to parse AI sprint plan", e);
      }
    }

    if (orderedIds.length > 0) {
      // Prepare task orders
      const taskOrders = orderedIds.map((id, index) => ({
        taskId: id,
        order: index,
      }));

      // Update DB
      // 1. Update mindmap
      sprint.mindmap = `Sprint Plan generated by AI at ${new Date().toISOString()}`;
      sprint.mindmapUpdatedAt = new Date();
      await this.sprintRepository.save(sprint);

      // 2. Batch update task orders
      if (taskOrders.length > 0) {
        await Promise.all(
          taskOrders.map(({ taskId, order }) =>
            this.sprintRepository.manager
              .createQueryBuilder()
              .update("tasks")
              .set({ order })
              .where("id = :id", { id: taskId })
              .execute()
          )
        );
      }

      return sprint;
    }

    return sprint;
  }
}
