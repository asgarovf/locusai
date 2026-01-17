import { Router } from "express";
import type { CiController } from "../controllers/ci.controller.js";

export function createCiRouter(controller: CiController) {
  const router = Router();

  router.post("/run", controller.run);

  return router;
}
