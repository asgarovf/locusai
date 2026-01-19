import { Router } from "express";
import type { DocController } from "../controllers/doc.controller.js";
import { validateBody } from "../middleware/index.js";
import { WriteDocRequestSchema } from "../schemas/index.js";

export function createDocsRouter(controller: DocController) {
  const router = Router();

  router.get("/", controller.getAll);
  router.get("/tree", controller.getTree);
  router.get("/read", controller.read);
  router.post("/write", validateBody(WriteDocRequestSchema), controller.write);

  return router;
}
