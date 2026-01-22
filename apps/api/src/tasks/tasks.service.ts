import {
  AcceptanceItem,
  AssigneeRole,
  EventType,
  TaskPriority,
  TaskStatus,
  UpdateTask,
} from "@locusai/shared";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThan, Repository } from "typeorm";
import { Artifact, Comment, Doc, Event, Task } from "@/entities";
import { EventsService } from "@/events/events.service";
import { TaskProcessor } from "./task.processor";

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    @InjectRepository(Doc)
    private readonly docRepository: Repository<Doc>,
    private readonly eventsService: EventsService,
    private readonly processor: TaskProcessor
  ) {}

  async findAll(workspaceId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  async findBacklog(workspaceId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { workspaceId, sprintId: undefined },
      order: { priority: "DESC", createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<
    Task & {
      activityLog: Event[];
      comments: Comment[];
      artifacts: Artifact[];
    }
  > {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["docs"],
    });
    if (!task) throw new NotFoundException("Task not found");

    const [events, comments, artifacts] = await Promise.all([
      this.eventsService.getByTaskId(id),
      this.commentRepository.find({
        where: { taskId: id },
        order: { createdAt: "DESC" },
      }),
      this.artifactRepository.find({
        where: { taskId: id },
        order: { createdAt: "DESC" },
      }),
    ]);

    return {
      ...task,
      activityLog: events,
      comments,
      artifacts,
    };
  }

  async create(data: {
    workspaceId: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    labels?: string[];
    assigneeRole?: AssigneeRole;
    assignedTo?: string;
    dueDate?: Date;
    parentId?: string;
    sprintId?: string;
    acceptanceChecklist?: AcceptanceItem[];
    docIds?: string[];
    userId?: string;
  }): Promise<Task> {
    const defaultItems: AcceptanceItem[] = [
      { id: `default-lint-${Date.now()}`, text: "bun run lint", done: false },
      {
        id: `default-typecheck-${Date.now()}`,
        text: "bun run typecheck",
        done: false,
      },
    ];

    const mergedChecklist = [
      ...(data.acceptanceChecklist || []),
      ...defaultItems,
    ];

    const task = this.taskRepository.create({
      workspaceId: data.workspaceId,
      title: data.title,
      description: data.description,
      status: data.status || TaskStatus.BACKLOG,
      priority: data.priority || TaskPriority.MEDIUM,
      labels: data.labels || [],
      assigneeRole: data.assigneeRole,
      assignedTo: data.assignedTo || null,
      dueDate: data.dueDate || null,
      parentId: data.parentId,
      sprintId: data.sprintId,
      acceptanceChecklist: mergedChecklist,
      docs: data.docIds
        ? await this.docRepository.find({ where: { id: In(data.docIds) } })
        : [],
    });

    const saved = await this.taskRepository.save(task);
    const result = (Array.isArray(saved) ? saved[0] : saved) as Task;

    await this.eventsService.logEvent({
      workspaceId: data.workspaceId,
      taskId: result.id,
      userId: data.userId || null,
      type: EventType.TASK_CREATED,
      payload: { title: data.title },
    });

    return result;
  }

  async update(
    id: string,
    updates: UpdateTask,
    userId?: string
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");

    if (updates.status === "DONE" && task.status !== "VERIFICATION") {
      throw new BadRequestException(
        "Cannot move directly to DONE. Tasks must be in VERIFICATION first for human review."
      );
    }

    const oldStatus = task.status;
    const newStatus = updates.status;

    // Auto-lock when moving to IN_PROGRESS
    if (newStatus === TaskStatus.IN_PROGRESS && !task.lockedBy) {
      const agentId = updates.assignedTo || userId || "human";
      const ttlSeconds = 3600; // 1 hour default
      task.lockedBy = agentId;
      task.lockExpiresAt = new Date(Date.now() + ttlSeconds * 1000);
    }

    // Auto-unlock when moving back to BACKLOG or DONE
    if (
      (newStatus === TaskStatus.BACKLOG || newStatus === TaskStatus.DONE) &&
      task.lockedBy
    ) {
      task.lockedBy = null;
      task.lockExpiresAt = null;
    }

    const { comments, artifacts, activityLog, ...rest } = updates;
    Object.assign(task, {
      ...rest,
      lockExpiresAt: rest.lockExpiresAt
        ? new Date(rest.lockExpiresAt)
        : task.lockExpiresAt,
      dueDate: rest.dueDate ? new Date(rest.dueDate) : task.dueDate,
    });

    if (updates.docIds) {
      task.docs = await this.docRepository.find({
        where: { id: In(updates.docIds) },
      });
    }

    const saved = await this.taskRepository.save(task);
    const result = (Array.isArray(saved) ? saved[0] : saved) as Task;

    if (updates.status && updates.status !== oldStatus) {
      await this.eventsService.logEvent({
        workspaceId: result.workspaceId,
        taskId: id,
        userId: userId || null,
        type: EventType.STATUS_CHANGED,
        payload: {
          title: result.title,
          oldStatus: oldStatus as TaskStatus,
          newStatus: updates.status as TaskStatus,
        },
      });

      this.processor
        .onStatusChanged(id, oldStatus, updates.status)
        .catch((err) => console.error("[TasksService] Processor error:", err));
    }

    // Log auto-lock if it happened
    if (
      newStatus === TaskStatus.IN_PROGRESS &&
      !task.lockedBy &&
      result.lockedBy
    ) {
      await this.eventsService.logEvent({
        workspaceId: result.workspaceId,
        taskId: id,
        userId: userId || null,
        type: EventType.LOCKED,
        payload: {
          agentId: result.lockedBy,
          expiresAt: result.lockExpiresAt?.getTime(),
          automatic: true,
        },
      });
    }

    // Log auto-unlock if it happened
    if (
      (newStatus === TaskStatus.BACKLOG || newStatus === TaskStatus.DONE) &&
      task.lockedBy &&
      !result.lockedBy
    ) {
      await this.eventsService.logEvent({
        workspaceId: result.workspaceId,
        taskId: id,
        userId: userId || null,
        type: EventType.UNLOCKED,
        payload: {
          agentId: task.lockedBy,
          automatic: true,
        },
      });
    }

    return result;
  }

  async delete(id: string, userId?: string): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");

    await this.eventsService.logEvent({
      workspaceId: task.workspaceId,
      userId: userId || null,
      type: EventType.TASK_DELETED,
      payload: { title: task.title },
    });

    await this.taskRepository.remove(task);
  }

  async addComment(
    taskId: string,
    author: string,
    text: string,
    userId?: string
  ): Promise<Comment> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException("Task not found");

    const comment = this.commentRepository.create({
      taskId,
      author,
      text,
    });

    const saved = await this.commentRepository.save(comment);
    const result = (Array.isArray(saved) ? saved[0] : saved) as Comment;

    await this.eventsService.logEvent({
      workspaceId: task.workspaceId,
      taskId,
      userId: userId || null,
      type: EventType.COMMENT_ADDED,
      payload: { title: task.title, author, text },
    });

    return result;
  }

  async dispatchTask(workerId: string, sprintId: string): Promise<Task> {
    const lockDurationMs = 3600 * 1000; // 1 hour
    const agentName =
      workerId || `agent-${Math.random().toString(36).slice(2, 10)}`;

    // Try to find an unlocked task in the sprint
    const task = await this.taskRepository.findOne({
      where: [
        { sprintId, lockedBy: null, status: In(["BACKLOG", "TODO"]) },
        {
          sprintId,
          lockExpiresAt: LessThan(new Date()),
          status: In(["BACKLOG", "TODO"]),
        },
      ],
      order: { priority: "DESC", createdAt: "ASC" },
    });

    if (!task) throw new NotFoundException("No available tasks in this sprint");

    const expiresAt = new Date(Date.now() + lockDurationMs);
    task.lockedBy = agentName;
    task.lockExpiresAt = expiresAt;

    const saved = await this.taskRepository.save(task);
    const result = (Array.isArray(saved) ? saved[0] : saved) as Task;

    await this.eventsService.logEvent({
      workspaceId: result.workspaceId,
      taskId: result.id,
      type: EventType.LOCKED,
      payload: {
        agentId: agentName,
        expiresAt: expiresAt.getTime(),
      },
    });

    return result;
  }

  async lockTask(
    id: string,
    agentId: string,
    ttlSeconds: number,
    userId?: string
  ): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    if (
      task.lockedBy &&
      task.lockedBy !== agentId &&
      task.lockExpiresAt &&
      task.lockExpiresAt > now
    ) {
      throw new ForbiddenException(`Task already locked by ${task.lockedBy}`);
    }

    task.lockedBy = agentId;
    task.lockExpiresAt = expiresAt;
    await this.taskRepository.save(task);

    await this.eventsService.logEvent({
      workspaceId: task.workspaceId,
      taskId: id,
      userId: userId || null,
      type: EventType.LOCKED,
      payload: { agentId, expiresAt: expiresAt.getTime() },
    });
  }

  async unlockTask(
    id: string,
    agentId: string,
    userId?: string
  ): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");

    if (task.lockedBy && task.lockedBy !== agentId && agentId !== "human") {
      throw new ForbiddenException("Not authorized to unlock this task");
    }

    task.lockedBy = null;
    task.lockExpiresAt = null;
    await this.taskRepository.save(task);

    await this.eventsService.logEvent({
      workspaceId: task.workspaceId,
      taskId: id,
      userId: userId || null,
      type: EventType.UNLOCKED,
      payload: { agentId },
    });
  }
}
