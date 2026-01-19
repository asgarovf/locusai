/**
 * Artifact Routes
 */

import { Router } from "express";
import type { ArtifactController } from "../controllers/artifact.controller.js";

export function createArtifactsRouter(controller: ArtifactController) {
  const router = Router();

  router.get("/:taskId", controller.getByTaskId);
  router.get("/:taskId/:type/:filename", controller.getArtifactFile);

  return router;
}
