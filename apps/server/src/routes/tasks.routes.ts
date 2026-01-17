import { Router } from "express";
import type { TaskController } from "../controllers/task.controller.js";

export function createTaskRouter(controller: TaskController) {
  const router = Router();

  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.delete);
  router.post("/:id/comment", controller.addComment);
  router.post("/dispatch", controller.dispatch);
  router.post("/:id/lock", controller.lock);
  router.post("/:id/unlock", controller.unlock);

  return router;
}
