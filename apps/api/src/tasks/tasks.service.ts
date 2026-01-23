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
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { Comment } from "@/entities/comment.entity";
import { Doc } from "@/entities/doc.entity";
import { Event } from "@/entities/event.entity";
import { Task } from "@/entities/task.entity";
import { EventsService } from "@/events/events.service";
import { TaskProcessor } from "./task.processor";

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
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
      where: [
        { workspaceId, sprintId: IsNull() },
        { workspaceId, status: TaskStatus.IN_PROGRESS, assignedTo: IsNull() },
      ],
      order: { priority: "DESC", createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<
    Task & {
      activityLog: Event[];
      comments: Comment[];
    }
  > {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["docs"],
    });
    if (!task) throw new NotFoundException("Task not found");

    const [events, comments] = await Promise.all([
      this.eventsService.getByTaskId(id),
      this.commentRepository.find({
        where: { taskId: id },
        order: { createdAt: "DESC" },
      }),
    ]);

    return {
      ...task,
      activityLog: events,
      comments,
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

    // Handle rejection: If moving from VERIFICATION back to IN_PROGRESS or BACKLOG,
    // clear the assignedTo field so it can be re-dispatched.
    if (
      oldStatus === TaskStatus.VERIFICATION &&
      (updates.status === TaskStatus.IN_PROGRESS ||
        updates.status === TaskStatus.BACKLOG)
    ) {
      task.assignedTo = null;
    }

    const { comments, activityLog, ...rest } = updates;
    Object.assign(task, {
      ...rest,
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

  /**
   * Dispatch a task from BACKLOG to an agent.
   * Simply finds a BACKLOG task in the sprint and moves it to IN_PROGRESS.
   */
  async dispatchTask(
    workspaceId: string,
    workerId: string,
    sprintId?: string
  ): Promise<Task> {
    // Find a BACKLOG or IN_PROGRESS (unassigned) task in the workspace/sprint
    const task = await this.taskRepository.findOne({
      where: [
        {
          workspaceId,
          ...(sprintId ? { sprintId } : {}),
          status: TaskStatus.BACKLOG,
        },
        {
          workspaceId,
          ...(sprintId ? { sprintId } : {}),
          status: TaskStatus.IN_PROGRESS,
          assignedTo: IsNull(),
        },
      ],
      order: { priority: "DESC", createdAt: "ASC" },
    });

    if (!task) {
      throw new NotFoundException("No available tasks");
    }

    const oldStatus = task.status;

    // Move to IN_PROGRESS and assign to worker
    task.status = TaskStatus.IN_PROGRESS;
    task.assignedTo = workerId;

    const saved = await this.taskRepository.save(task);
    const result = (Array.isArray(saved) ? saved[0] : saved) as Task;

    await this.eventsService.logEvent({
      workspaceId: result.workspaceId,
      taskId: result.id,
      type: EventType.STATUS_CHANGED,
      payload: {
        title: result.title,
        oldStatus,
        newStatus: TaskStatus.IN_PROGRESS,
        assignedTo: workerId,
      },
    });

    return result;
  }
}
