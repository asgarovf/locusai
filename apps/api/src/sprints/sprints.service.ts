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

  async planSprintWithAi(
    sprintId: string,
    workspaceId: string,
    userId?: string
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
    try {
      const agent = await this.aiService.getAgent(
        workspaceId,
        undefined,
        userId
      );

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
        Return a JSON object with two fields:
        1. "summary": A markdown formatted explanation of the sprint plan, highlighting key focus areas and dependencies.
        2. "taskIds": A JSON array of sorted task IDs.
        
        Example format:
        {
          "summary": "### Sprint Focus\nWe will focus on...",
          "taskIds": ["id1", "id2"]
        }
      `;

      const responseContent = await agent.invoke(prompt);

      // Parse Response
      let planData: { summary: string; taskIds: string[] } | null = null;

      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.taskIds && Array.isArray(parsed.taskIds)) {
            planData = parsed;
          }
        } catch (e) {
          console.warn("Failed to parse full AI sprint plan object", e);
        }
      }

      // Fallback to array-only parsing if object parsing failed
      if (!planData) {
        const arrayMatch = responseContent.match(/\[.*\]/s);
        if (arrayMatch) {
          try {
            planData = {
              summary: `Sprint Plan generated by AI at ${new Date().toISOString()}`,
              taskIds: JSON.parse(arrayMatch[0]),
            };
          } catch (e) {
            console.warn("Failed to parse fallback AI sprint plan array", e);
          }
        }
      }

      if (planData && planData.taskIds.length > 0) {
        const { summary, taskIds } = planData;

        // Prepare task orders
        const taskOrders = taskIds.map((id, index) => ({
          taskId: id,
          order: index,
        }));

        // Update DB
        // 1. Update mindmap with real summary
        sprint.mindmap = summary;
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
    } catch (error) {
      console.warn("[SprintsService] AI Sprint Planning failed:", error);
      // We do NOT re-throw, as planning is an enhancement, not a critical failure.
      // Returning the sprint as-is allows the system to continue.
      return sprint;
    }

    return sprint;
  }
}
