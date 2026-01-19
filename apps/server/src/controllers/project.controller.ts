/**
 * Project Controller
 */

import type { Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "../schemas/index.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { TypedRequest } from "../types/index.js";

export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private orgService: OrganizationService
  ) {}

  /**
   * POST /api/projects
   */
  create = asyncHandler(
    async (req: TypedRequest<CreateProjectRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const { orgId } = req.body;
      await this.orgService.checkMembership(
        req.auth.userId,
        orgId,
        ["ADMIN"],
        req.auth.role
      );

      const project = await this.projectService.createProject(req.body);
      ResponseBuilder.success(res, project, 201);
    }
  );

  /**
   * GET /api/projects/:id
   */
  getOne = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const project = await this.projectService.getProject(id);

    await this.orgService.checkMembership(
      req.auth.userId,
      project.orgId,
      ["MEMBER", "ADMIN"],
      req.auth.role
    );

    ResponseBuilder.success(res, project);
  });

  /**
   * GET /api/projects
   */
  list = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const orgId = req.query.orgId as string;
    if (!orgId) throw new UnauthorizedError("Organization context required");

    await this.orgService.checkMembership(
      req.auth.userId,
      orgId,
      ["MEMBER", "ADMIN"],
      req.auth.role
    );

    const projects = await this.projectService.listProjects(orgId);
    ResponseBuilder.success(res, { projects });
  });

  /**
   * PATCH /api/projects/:id
   */
  update = asyncHandler(
    async (req: TypedRequest<UpdateProjectRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const id = req.params.id as string;
      const project = await this.projectService.getProject(id);

      await this.orgService.checkMembership(
        req.auth.userId,
        project.orgId,
        ["ADMIN"],
        req.auth.role
      );

      const updated = await this.projectService.updateProject(id, req.body);
      ResponseBuilder.success(res, updated);
    }
  );

  /**
   * DELETE /api/projects/:id
   */
  delete = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const project = await this.projectService.getProject(id);

    await this.orgService.checkMembership(
      req.auth.userId,
      project.orgId,
      ["ADMIN"],
      req.auth.role
    );

    await this.projectService.deleteProject(id);
    ResponseBuilder.message(res, "Project deleted successfully");
  });
}
