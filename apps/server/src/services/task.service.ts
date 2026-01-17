import type {
  AcceptanceItem,
  AssigneeRole,
  EventType,
  Task,
  TaskPriority,
  TaskStatus,
} from "@locusai/shared";
import type { ArtifactRepository } from "../repositories/artifact.repository.js";
import type { CommentRepository } from "../repositories/comment.repository.js";
import type { EventRepository } from "../repositories/event.repository.js";
import type { TaskRepository } from "../repositories/task.repository.js";
import type { TaskProcessor } from "../task-processor.js";

export class ServiceError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export interface CreateTaskData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  assigneeRole?: AssigneeRole;
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

  getAllTasks(): Task[] {
    return this.taskRepo.findAll();
  }

  getTaskById(id: number | string): Task {
    const task = this.taskRepo.findById(id);
    if (!task) throw new ServiceError("Task not found", 404);

    const events = this.eventRepo.findByTaskId(id);
    const comments = this.commentRepo.findByTaskId(id);
    const artifacts = this.artifactRepo.findByTaskId(id);

    return {
      ...task,
      activityLog: events.map((e) => ({
        id: e.id,
        taskId: Number(e.taskId),
        type: e.type as EventType,
        payload: JSON.parse(e.payload || "{}"),
        createdAt: e.createdAt,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        taskId: Number(c.taskId),
        author: c.author,
        text: c.text,
        createdAt: c.createdAt,
      })),
      artifacts: artifacts.map((a) => ({
        id: a.id,
        taskId: Number(a.taskId),
        type: a.type,
        title: a.title,
        url: a.filePath || "",
        size: "0",
        createdBy: a.createdBy || "system",
        createdAt: a.createdAt,
      })),
    };
  }

  createTask(data: CreateTaskData): number {
    const id = this.taskRepo.create(data);
    this.eventRepo.create(id, "TASK_CREATED", { title: data.title });
    return id;
  }

  updateTask(id: number | string, updates: Partial<Task>): void {
    const oldTask = this.taskRepo.findById(id);
    if (!oldTask) throw new ServiceError("Task not found", 404);

    if (updates.status === "DONE" && oldTask.status !== "VERIFICATION") {
      throw new ServiceError(
        "Cannot move directly to DONE. Tasks must be in VERIFICATION first for human review."
      );
    }

    this.taskRepo.update(id, updates);

    if (updates.status && updates.status !== oldTask.status) {
      this.eventRepo.create(id, "STATUS_CHANGED", {
        oldStatus: oldTask.status,
        newStatus: updates.status,
      });

      this.processor.onStatusChanged(
        id.toString(),
        oldTask.status,
        updates.status
      );
    }
  }

  deleteTask(id: number | string): void {
    const task = this.taskRepo.findById(id);
    if (!task) throw new ServiceError("Task not found", 404);

    this.commentRepo.deleteByTaskId(id);
    this.eventRepo.deleteByTaskId(id);
    this.artifactRepo.deleteByTaskId(id);
    this.taskRepo.delete(id);
  }

  addComment(taskId: number | string, author: string, text: string): void {
    this.commentRepo.create(taskId, author, text);
    this.eventRepo.create(taskId, "COMMENT_ADDED", { author, text });
  }

  dispatchTask(workerId: string, sprintId: number): Task {
    const now = Date.now();
    const expiresAt = now + 3600 * 1000;
    const agentName = workerId || `agent-${crypto.randomUUID().slice(0, 8)}`;

    const task = this.taskRepo.findCandidateForDispatch(
      now,
      sprintId,
      agentName,
      expiresAt
    );
    if (!task) throw new ServiceError("No tasks available", 404);

    this.eventRepo.create(task.id, "LOCKED", { agentId: agentName, expiresAt });
    return task;
  }

  lockTask(id: number | string, agentId: string, ttlSeconds: number): void {
    const task = this.taskRepo.findById(id);
    if (!task) throw new ServiceError("Task not found", 404);

    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    if (
      task.lockedBy &&
      task.lockedBy !== agentId &&
      (task.lockExpiresAt || 0) > now
    ) {
      throw new ServiceError(`Task locked by ${task.lockedBy}`, 403);
    }

    this.taskRepo.lock(id, agentId, expiresAt, now);
    this.eventRepo.create(id, "LOCKED", { agentId, expiresAt });
  }

  unlockTask(id: number | string, agentId: string): void {
    const task = this.taskRepo.findById(id);
    if (!task) throw new ServiceError("Task not found", 404);

    if (task.lockedBy && task.lockedBy !== agentId && agentId !== "human") {
      throw new ServiceError("Not authorized to unlock", 403);
    }

    const now = Date.now();
    this.taskRepo.unlock(id, now);
    this.eventRepo.create(id, "UNLOCKED", { agentId });
  }
}
