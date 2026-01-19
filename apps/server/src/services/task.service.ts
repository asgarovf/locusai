/**
 * Task Service
 *
 * Implements business logic for task management.
 */

import type {
  AcceptanceItem,
  AssigneeRole,
  TaskPriority,
  TaskStatus,
} from "@locusai/shared";
import type { Task } from "../db/schema.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../lib/errors.js";
import type {
  ArtifactRepository,
  CommentRepository,
  EventRepository,
  TaskRepository,
} from "../repositories";
import { TaskProcessor } from "../task-processor.js";

export interface CreateTaskData {
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  assigneeRole?: AssigneeRole | null;
  parentId?: number | null;
  sprintId?: number | null;
  acceptanceChecklist?: AcceptanceItem[];
}

export class TaskService {
  constructor(
    private taskRepo: TaskRepository,
    private eventRepo: EventRepository,
    private commentRepo: CommentRepository,
    private artifactRepo: ArtifactRepository,
    private processor: TaskProcessor
  ) {}

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Task[]> {
    return this.taskRepo.findAll();
  }

  /**
   * Get task by ID with full activity log, comments, and artifacts
   */
  async getTaskById(id: number) {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundError("Task");

    const [events, comments, artifacts] = await Promise.all([
      this.eventRepo.findByTaskId(id),
      this.commentRepo.findByTaskId(id),
      this.artifactRepo.findByTaskId(id),
    ]);

    return {
      ...task,
      activityLog: events,
      comments: comments,
      artifacts: artifacts,
    };
  }

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskData): Promise<Task> {
    const defaultItems: AcceptanceItem[] = [
      { id: `default-lint-${Date.now()}`, text: "bun run lint", done: false },
      {
        id: `default-typecheck-${Date.now()}`,
        text: "bun run typecheck",
        done: false,
      },
    ];

    const currentChecklist = data.acceptanceChecklist || [];
    const hasLint = currentChecklist.some((item) => item.text.includes("lint"));
    const hasTypecheck = currentChecklist.some((item) =>
      item.text.includes("typecheck")
    );

    const mergedChecklist = [...currentChecklist];
    if (!hasLint) mergedChecklist.push(defaultItems[0]);
    if (!hasTypecheck) mergedChecklist.push(defaultItems[1]);

    const task = await this.taskRepo.create({
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      labels: data.labels,
      assigneeRole: data.assigneeRole,
      parentId: data.parentId,
      sprintId: data.sprintId,
      acceptanceChecklist: mergedChecklist,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.eventRepo.create({
      taskId: task.id,
      type: "TASK_CREATED",
      payload: { title: data.title },
      createdAt: new Date(),
    });

    return task;
  }

  /**
   * Update task details
   */
  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const oldTask = await this.taskRepo.findById(id);
    if (!oldTask) throw new NotFoundError("Task");

    // Quality Gate: Enforce human review transition
    if (updates.status === "DONE" && oldTask.status !== "VERIFICATION") {
      throw new BadRequestError(
        "Cannot move directly to DONE. Tasks must be in VERIFICATION first for human review."
      );
    }

    const updatedTask = await this.taskRepo.update(id, updates);
    if (!updatedTask) throw new NotFoundError("Task");

    // Handle status change side effects
    if (updates.status && updates.status !== oldTask.status) {
      await this.eventRepo.create({
        taskId: id,
        type: "STATUS_CHANGED",
        payload: {
          oldStatus: oldTask.status,
          newStatus: updates.status,
        },
        createdAt: new Date(),
      });

      // Trigger background processor
      // No await here to not block the request
      this.processor
        .onStatusChanged(id, oldTask.status, updates.status)
        .catch((err) => console.error("[TaskService] Processor error:", err));
    }

    return updatedTask;
  }

  /**
   * Delete task and related data
   */
  async deleteTask(id: number): Promise<void> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundError("Task");

    await Promise.all([
      this.commentRepo.deleteByTaskId(id),
      this.eventRepo.deleteByTaskId(id),
      this.artifactRepo.deleteByTaskId(id),
      this.taskRepo.delete(id),
    ]);
  }

  /**
   * Add a comment to a task
   */
  async addComment(
    taskId: number,
    author: string,
    text: string
  ): Promise<void> {
    await Promise.all([
      this.commentRepo.create({
        taskId,
        author,
        text,
        createdAt: new Date(),
      }),
      this.eventRepo.create({
        taskId,
        type: "COMMENT_ADDED",
        payload: { author, text },
        createdAt: new Date(),
      }),
    ]);
  }

  /**
   * Dispatch a task to a worker (auto-lock)
   */
  async dispatchTask(workerId: string, sprintId: number): Promise<Task> {
    const lockDurationMs = 3600 * 1000; // 1 hour
    const agentName =
      workerId || `agent-${Math.random().toString(36).slice(2, 10)}`;

    const task = await this.taskRepo.findCandidateForDispatch(
      sprintId,
      agentName,
      lockDurationMs
    );

    if (!task) throw new NotFoundError("No available tasks in this sprint");

    await this.eventRepo.create({
      taskId: task.id,
      type: "LOCKED",
      payload: {
        agentId: agentName,
        expiresAt: task.lockExpiresAt?.getTime(),
      },
      createdAt: new Date(),
    });

    return task;
  }

  /**
   * Lock a task for an agent
   */
  async lockTask(
    id: number,
    agentId: string,
    ttlSeconds: number
  ): Promise<void> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundError("Task");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    if (
      task.lockedBy &&
      task.lockedBy !== agentId &&
      task.lockExpiresAt &&
      task.lockExpiresAt > now
    ) {
      throw new ForbiddenError(`Task already locked by ${task.lockedBy}`);
    }

    await this.taskRepo.lock(id, agentId, expiresAt);
    await this.eventRepo.create({
      taskId: id,
      type: "LOCKED",
      payload: { agentId, expiresAt: expiresAt.getTime() },
      createdAt: new Date(),
    });
  }

  /**
   * Unlock a task
   */
  async unlockTask(id: number, agentId: string): Promise<void> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundError("Task");

    if (task.lockedBy && task.lockedBy !== agentId && agentId !== "human") {
      throw new ForbiddenError("Not authorized to unlock this task");
    }

    await this.taskRepo.unlock(id);
    await this.eventRepo.create({
      taskId: id,
      type: "UNLOCKED",
      payload: { agentId },
      createdAt: new Date(),
    });
  }
}
