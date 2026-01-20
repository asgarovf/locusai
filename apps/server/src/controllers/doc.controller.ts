/**
 * Doc Controller
 */

import type { Response } from "express";
import { BadRequestError, UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type { DocService } from "../services/doc.service.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { TypedRequest } from "../types/index.js";

export class DocController {
  private isCloud: boolean;

  constructor(
    private docService: DocService,
    isCloud: boolean = false,
    private projectService?: ProjectService,
    private orgService?: OrganizationService
  ) {
    this.isCloud = isCloud;
  }

  /**
   * Helper to validate project access in cloud mode
   */
  private async validateProjectAccess(
    userId: string,
    role: string,
    projectId: string | undefined
  ): Promise<void> {
    if (!this.isCloud) return;

    if (!projectId) {
      throw new BadRequestError("projectId is required in cloud mode");
    }

    if (!this.projectService || !this.orgService) {
      throw new Error("Cloud mode not properly configured");
    }

    const project = await this.projectService.getProject(projectId);
    await this.orgService.checkMembership(
      userId,
      project.orgId,
      ["MEMBER", "ADMIN"],
      role
    );
  }

  /**
   * GET /api/docs
   */
  getAll = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const projectId = req.query.projectId as string | undefined;
    await this.validateProjectAccess(req.auth.userId, req.auth.role, projectId);

    const docs = await this.docService.getAll(projectId);
    ResponseBuilder.success(res, { docs });
  });

  /**
   * GET /api/docs/tree
   */
  getTree = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const projectId = req.query.projectId as string | undefined;
    await this.validateProjectAccess(req.auth.userId, req.auth.role, projectId);

    const tree = await this.docService.getTree(projectId);
    ResponseBuilder.success(res, { tree });
  });

  /**
   * GET /api/docs/read
   */
  read = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const projectId = req.query.projectId as string | undefined;
    const filePath = req.query.path as string;
    await this.validateProjectAccess(req.auth.userId, req.auth.role, projectId);

    const content = await this.docService.read(filePath, projectId);
    ResponseBuilder.success(res, { content });
  });

  /**
   * POST /api/docs/write
   */
  write = asyncHandler(
    async (
      req: TypedRequest<{ path: string; content: string; projectId?: string }>,
      res: Response
    ) => {
      if (!req.auth) throw new UnauthorizedError();
      const { path, content, projectId } = req.body;
      await this.validateProjectAccess(
        req.auth.userId,
        req.auth.role,
        projectId
      );

      await this.docService.write(path, content, req.auth.userId, projectId);
      ResponseBuilder.message(res, "Document updated");
    }
  );

  /**
   * DELETE /api/docs
   */
  delete = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const projectId = req.query.projectId as string | undefined;
    const filePath = req.query.path as string;

    console.log("[DocController] DELETE request received:", {
      filePath,
      projectId,
    });

    await this.validateProjectAccess(req.auth.userId, req.auth.role, projectId);

    await this.docService.delete(filePath, projectId);

    console.log("[DocController] Document deleted successfully:", filePath);

    ResponseBuilder.message(res, "Document deleted");
  });
}
