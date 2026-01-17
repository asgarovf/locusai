import { Router } from "express";
import type { DocController } from "../controllers/doc.controller.js";

export function createDocsRouter(controller: DocController) {
  const router = Router();

  router.get("/", controller.getAll);
  router.get("/tree", controller.getTree);
  router.get("/read", controller.read);
  router.post("/write", controller.write);

  return router;
}
