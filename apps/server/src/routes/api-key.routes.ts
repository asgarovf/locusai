/**
 * API Key Routes
 */

import { Router } from "express";
import type { ApiKeyController } from "../controllers/api-key.controller.js";
import { validateBody } from "../middleware/index.js";
import { CreateApiKeyRequestSchema } from "../schemas/index.js";

export function createApiKeyRouter(controller: ApiKeyController) {
  const router = Router();

  router.post("/", validateBody(CreateApiKeyRequestSchema), controller.create);
  router.get("/", controller.list);
  router.delete("/:id", controller.delete);

  return router;
}
