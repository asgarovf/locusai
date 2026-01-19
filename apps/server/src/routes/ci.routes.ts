import { Router } from "express";
import type { CiController } from "../controllers/ci.controller.js";
import { validateBody } from "../middleware/index.js";
import { RecordCiRequestSchema } from "../schemas/index.js";

export function createCiRouter(controller: CiController) {
  const router = Router();

  router.post(
    "/record",
    validateBody(RecordCiRequestSchema),
    controller.record
  );

  return router;
}
