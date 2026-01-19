/**
 * Event Controller
 */

import type { Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type { EventService } from "../services/event.service.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { TaskService } from "../services/task.service.js";
import type { TypedRequest } from "../types/index.js";

export class EventController {
  constructor(
    private eventService: EventService,
    private taskService: TaskService,
    private projectService: ProjectService,
    private orgService: OrganizationService
  ) {}

  /**
   * GET /api/events
   */
  getByTaskId = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const taskIdString = req.query.taskId as string;
    if (!taskIdString) {
      return ResponseBuilder.success(res, { events: [] as unknown[] });
    }

    const taskId = Number(taskIdString);

    // Check membership
    const task = await this.taskService.getTaskById(taskId);
    if (task.projectId) {
      const project = await this.projectService.getProject(task.projectId);
      await this.orgService.checkMembership(
        req.auth.userId,
        project.orgId,
        ["MEMBER", "ADMIN"],
        req.auth.role
      );
    }

    const events = await this.eventService.getByTaskId(taskId);
    ResponseBuilder.success(res, { events });
  });
}
