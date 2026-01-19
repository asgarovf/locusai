/**
 * Event Routes
 */

import { Router } from "express";
import type { EventController } from "../controllers/event.controller.js";

export function createEventsRouter(controller: EventController) {
  const router = Router();

  router.get("/", controller.getByTaskId);

  return router;
}
