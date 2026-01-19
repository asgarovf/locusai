/**
 * Project Routes
 */

import { Router } from "express";
import type { ProjectController } from "../controllers/project.controller.js";
import { validateBody } from "../middleware/index.js";
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
} from "../schemas/index.js";

export function createProjectRouter(controller: ProjectController) {
  const router = Router();

  router.post("/", validateBody(CreateProjectRequestSchema), controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getOne);
  router.patch(
    "/:id",
    validateBody(UpdateProjectRequestSchema),
    controller.update
  );
  router.delete("/:id", controller.delete);

  return router;
}
