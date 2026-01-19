/**
 * Organization Routes
 */

import { Router } from "express";
import type { OrganizationController } from "../controllers/organization.controller.js";
import { validateBody } from "../middleware/index.js";
import {
  AddMemberRequestSchema,
  CreateOrganizationRequestSchema,
  UpdateOrganizationRequestSchema,
} from "../schemas/index.js";

export function createOrganizationRouter(controller: OrganizationController) {
  const router = Router();

  router.post(
    "/",
    validateBody(CreateOrganizationRequestSchema),
    controller.create
  );
  router.get("/:id", controller.getOne);
  router.patch(
    "/:id",
    validateBody(UpdateOrganizationRequestSchema),
    controller.update
  );
  router.delete("/:id", controller.delete);

  // Members
  router.get("/:id/members", controller.listMembers);
  router.post(
    "/:id/members",
    validateBody(AddMemberRequestSchema),
    controller.addMember
  );

  // Note: removeMember uses membership ID, maybe its own route group or under organizations
  router.delete("/memberships/:id", controller.removeMember);

  return router;
}
