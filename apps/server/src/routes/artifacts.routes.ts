import { Router } from "express";
import type { ArtifactController } from "../controllers/artifact.controller.js";

export function createArtifactsRouter(controller: ArtifactController) {
  const router = Router();

  router.get("/artifacts/:taskId", controller.getByTaskId);
  router.get("/artifacts/:taskId/:type/:filename", controller.getArtifactFile);

  return router;
}
