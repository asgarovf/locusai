import { Router } from "express";
import type { SprintController } from "../controllers/sprint.controller.js";

export function createSprintsRouter(controller: SprintController) {
  const router = Router();

  router.get("/", controller.getAll);
  router.post("/", controller.create);
  router.patch("/:id", controller.updateStatus);

  return router;
}
