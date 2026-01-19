/**
 * Artifact Controller
 */

import type { Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type { ArtifactService } from "../services/artifact.service.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { TaskService } from "../services/task.service.js";
import type { TypedRequest } from "../types/index.js";

export class ArtifactController {
  constructor(
    private artifactService: ArtifactService,
    private taskService: TaskService,
    private projectService: ProjectService,
    private orgService: OrganizationService
  ) {}

  /**
   * GET /api/tasks/:taskId/artifacts/:type/:filename
   */
  getArtifactFile = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const taskId = Number(req.params.taskId);

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

    const { type } = req.params;

    const content = await this.artifactService.getArtifactContent(
      taskId,
      type as string
    );

    res.type("text/plain").send(content);
  });

  /**
   * GET /api/tasks/:taskId/artifacts
   */
  getByTaskId = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const taskId = Number(req.params.taskId);

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

    const artifacts = await this.artifactService.getByTaskId(taskId);
    ResponseBuilder.success(res, { artifacts });
  });
}
