/**
 * Task Controller
 */

import type { Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type {
  AddCommentRequest,
  CreateTaskRequest,
  DispatchTaskRequest,
  LockTaskRequest,
  UnlockTaskRequest,
  UpdateTaskRequest,
} from "../schemas/index.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { TaskService } from "../services/task.service.js";
import type { TypedRequest } from "../types/index.js";
// ... (existing imports)

export class TaskController {
  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    private orgService: OrganizationService
  ) {}

  /**
   * GET /api/tasks
   */
  getAll = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const tasks = await this.taskService.getAllTasks();
    ResponseBuilder.success(res, { tasks });
  });

  /**
   * GET /api/tasks/:id
   */
  getById = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const id = Number(req.params.id);
    const detail = await this.taskService.getTaskById(id);

    if (detail.projectId) {
      const project = await this.projectService.getProject(detail.projectId);
      await this.orgService.checkMembership(
        req.auth.userId,
        project.orgId,
        ["MEMBER", "ADMIN"],
        req.auth.role
      );
    }

    ResponseBuilder.success(res, { task: detail });
  });

  /**
   * POST /api/tasks
   */
  create = asyncHandler(
    async (req: TypedRequest<CreateTaskRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const { projectId } = req.body;

      if (projectId) {
        const project = await this.projectService.getProject(projectId);
        await this.orgService.checkMembership(
          req.auth.userId,
          project.orgId,
          ["MEMBER", "ADMIN"],
          req.auth.role
        );
      }

      const task = await this.taskService.createTask(req.body);
      ResponseBuilder.success(res, { task }, 201);
    }
  );

  /**
   * PATCH /api/tasks/:id
   */
  update = asyncHandler(
    async (req: TypedRequest<UpdateTaskRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = Number(req.params.id);
      const detail = await this.taskService.getTaskById(id);

      if (detail.projectId) {
        const project = await this.projectService.getProject(detail.projectId);
        await this.orgService.checkMembership(
          req.auth.userId,
          project.orgId,
          ["MEMBER", "ADMIN"],
          req.auth.role
        );
      }

      const task = await this.taskService.updateTask(id, req.body);
      ResponseBuilder.success(res, { task });
    }
  );

  /**
   * DELETE /api/tasks/:id
   */
  delete = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const id = Number(req.params.id);
    const detail = await this.taskService.getTaskById(id);

    if (detail.projectId) {
      const project = await this.projectService.getProject(detail.projectId);
      await this.orgService.checkMembership(
        req.auth.userId,
        project.orgId,
        ["ADMIN"],
        req.auth.role
      );
    }

    await this.taskService.deleteTask(id);
    ResponseBuilder.message(res, "Task deleted");
  });

  /**
   * POST /api/tasks/:id/comment
   */
  addComment = asyncHandler(
    async (req: TypedRequest<AddCommentRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = Number(req.params.id);
      const detail = await this.taskService.getTaskById(id);

      if (detail.projectId) {
        const project = await this.projectService.getProject(detail.projectId);
        await this.orgService.checkMembership(
          req.auth.userId,
          project.orgId,
          ["MEMBER", "ADMIN"],
          req.auth.role
        );
      }

      const { author, text } = req.body;
      await this.taskService.addComment(id, author, text);
      ResponseBuilder.message(res, "Comment added");
    }
  );

  /**
   * POST /api/tasks/dispatch
   */
  dispatch = asyncHandler(
    async (req: TypedRequest<DispatchTaskRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const { workerId, sprintId } = req.body;
      // Dispatch logic doesn't strictly need org check here as it finds candidates for specific sprint
      const task = await this.taskService.dispatchTask(
        workerId || "system",
        sprintId
      );
      ResponseBuilder.success(res, { task });
    }
  );

  /**
   * POST /api/tasks/:id/lock
   */
  lock = asyncHandler(
    async (req: TypedRequest<LockTaskRequest>, res: Response) => {
      // Locking is usually done by agents, flexAuth handles it.
      const id = Number(req.params.id);
      const { agentId, ttlSeconds } = req.body;
      await this.taskService.lockTask(id, agentId, ttlSeconds);
      ResponseBuilder.message(res, "Task locked");
    }
  );

  /**
   * POST /api/tasks/:id/unlock
   */
  unlock = asyncHandler(
    async (req: TypedRequest<UnlockTaskRequest>, res: Response) => {
      const id = Number(req.params.id);
      const { agentId } = req.body;
      await this.taskService.unlockTask(id, agentId);
      ResponseBuilder.message(res, "Task unlocked");
    }
  );
}
