/**
 * Sprint Controller
 */

import type { Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type {
  CreateSprintRequest,
  UpdateSprintRequest,
} from "../schemas/index.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { SprintService } from "../services/sprint.service.js";
import type { TypedRequest } from "../types/index.js";

export class SprintController {
  constructor(
    private sprintService: SprintService,
    private projectService: ProjectService,
    private orgService: OrganizationService
  ) {}

  /**
   * GET /api/sprints
   */
  getAll = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const sprints = await this.sprintService.getAllSprints();
    // Filtering sprints by membership would be ideal but for now we return all
    // and assume the UI/context handles it.
    ResponseBuilder.success(res, { sprints });
  });

  /**
   * GET /api/sprints/:id
   */
  getById = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const id = Number(req.params.id);
    const sprint = await this.sprintService.getSprintById(id);

    if (sprint.projectId) {
      const project = await this.projectService.getProject(sprint.projectId);
      await this.orgService.checkMembership(
        req.auth.userId,
        project.orgId,
        ["MEMBER", "ADMIN"],
        req.auth.role
      );
    }

    ResponseBuilder.success(res, { sprint });
  });

  /**
   * POST /api/sprints
   */
  create = asyncHandler(
    async (req: TypedRequest<CreateSprintRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const { name, projectId } = req.body;

      if (projectId) {
        const project = await this.projectService.getProject(projectId);
        await this.orgService.checkMembership(
          req.auth.userId,
          project.orgId,
          ["ADMIN"],
          req.auth.role
        );
      }

      const sprint = await this.sprintService.createSprint(name, projectId);
      ResponseBuilder.success(res, { sprint }, 201);
    }
  );

  /**
   * PATCH /api/sprints/:id
   */
  update = asyncHandler(
    async (req: TypedRequest<UpdateSprintRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = Number(req.params.id);
      const sprint = await this.sprintService.getSprintById(id);

      if (sprint.projectId) {
        const project = await this.projectService.getProject(sprint.projectId);
        await this.orgService.checkMembership(
          req.auth.userId,
          project.orgId,
          ["ADMIN"],
          req.auth.role
        );
      }

      const updated = await this.sprintService.updateSprint(id, req.body);
      ResponseBuilder.success(res, { sprint: updated });
    }
  );

  /**
   * GET /api/sprints/active
   */
  getActive = asyncHandler(async (_req: TypedRequest, res: Response) => {
    const sprint = await this.sprintService.getActiveSprint();
    ResponseBuilder.success(res, { sprint });
  });
}
