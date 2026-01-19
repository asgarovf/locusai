import { Router } from "express";
import type { TaskController } from "../controllers/task.controller.js";
import { validateBody } from "../middleware/index.js";
import {
  AddCommentRequestSchema,
  CreateTaskRequestSchema,
  DispatchTaskRequestSchema,
  LockTaskRequestSchema,
  UnlockTaskRequestSchema,
  UpdateTaskRequestSchema,
} from "../schemas/index.js";

export function createTaskRouter(controller: TaskController) {
  const router = Router();

  router.get("/", controller.getAll);
  router.get("/:id", controller.getById);
  router.post("/", validateBody(CreateTaskRequestSchema), controller.create);
  router.patch(
    "/:id",
    validateBody(UpdateTaskRequestSchema),
    controller.update
  );
  router.delete("/:id", controller.delete);
  router.post(
    "/:id/comment",
    validateBody(AddCommentRequestSchema),
    controller.addComment
  );
  router.post(
    "/dispatch",
    validateBody(DispatchTaskRequestSchema),
    controller.dispatch
  );
  router.post(
    "/:id/lock",
    validateBody(LockTaskRequestSchema),
    controller.lock
  );
  router.post(
    "/:id/unlock",
    validateBody(UnlockTaskRequestSchema),
    controller.unlock
  );

  return router;
}
