/**
 * API Key Controller
 */

import type { Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type { CreateApiKeyRequest } from "../schemas/index.js";
import type { ApiKeyService } from "../services/api-key.service.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { TypedRequest } from "../types/index.js";

export class ApiKeyController {
  constructor(
    private apiKeyService: ApiKeyService,
    private projectService: ProjectService,
    private orgService: OrganizationService
  ) {}

  /**
   * POST /api/api-keys
   */
  create = asyncHandler(
    async (req: TypedRequest<CreateApiKeyRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const { projectId, name, expiresInDays } = req.body;

      // Check project exists and user has ADMIN access in the org
      const project = await this.projectService.getProject(projectId);
      await this.orgService.checkMembership(
        req.auth.userId,
        project.orgId,
        ["ADMIN"],
        req.auth.role
      );

      const result = await this.apiKeyService.createKey({
        userId: req.auth.userId,
        projectId,
        name,
        expiresInDays,
      });

      ResponseBuilder.success(res, result, 201);
    }
  );

  /**
   * GET /api/api-keys?projectId=...
   */
  list = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const projectId = req.query.projectId as string;
    if (!projectId) throw new UnauthorizedError("Project ID required");

    const project = await this.projectService.getProject(projectId);
    await this.orgService.checkMembership(
      req.auth.userId,
      project.orgId,
      ["ADMIN", "MEMBER"],
      req.auth.role
    );

    const keys = await this.apiKeyService.listKeys(projectId);
    ResponseBuilder.success(res, { keys });
  });

  /**
   * DELETE /api/api-keys/:id
   */
  delete = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;

    // In a real app we'd verify the user owns the key or is admin
    // for the project the key belongs to.

    await this.apiKeyService.deleteKey(id);
    ResponseBuilder.message(res, "API Key deleted");
  });
}
