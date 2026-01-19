/**
 * Sprint Routes
 */

import { Router } from "express";
import type { SprintController } from "../controllers/sprint.controller.js";
import { validateBody } from "../middleware/index.js";
import {
  CreateSprintRequestSchema,
  UpdateSprintRequestSchema,
} from "../schemas/index.js";

export function createSprintsRouter(controller: SprintController) {
  const router = Router();

  router.get("/", controller.getAll);
  router.post("/", validateBody(CreateSprintRequestSchema), controller.create);
  router.patch(
    "/:id",
    validateBody(UpdateSprintRequestSchema),
    controller.update
  );

  return router;
}
