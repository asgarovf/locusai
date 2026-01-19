/**
 * CI Controller
 */

import type { Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import type { RecordCiRequest } from "../schemas/index.js";
import type { CiService } from "../services/ci.service.js";
import type { OrganizationService } from "../services/organization.service.js";
import type { ProjectService } from "../services/project.service.js";
import type { TypedRequest } from "../types/index.js";

export class CiController {
  constructor(
    private ciService: CiService,
    private projectService: ProjectService,
    private orgService: OrganizationService
  ) {}

  /**
   * POST /api/ci/record
   */
  record = asyncHandler(
    async (req: TypedRequest<RecordCiRequest>, res: Response) => {
      if (!req.auth) throw new UnauthorizedError();
      const { taskId, projectId, result } = req.body;

      const project = await this.projectService.getProject(projectId);
      await this.orgService.checkMembership(
        req.auth.userId,
        project.orgId,
        ["MEMBER", "ADMIN"],
        req.auth.role
      );

      await this.ciService.recordRemoteCi(taskId, result);

      ResponseBuilder.message(res, "CI results recorded");
    }
  );
}
