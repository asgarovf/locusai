import type { NextFunction, Request, Response } from "express";
import type { SprintService } from "../services/sprint.service.js";

export class SprintController {
  constructor(private sprintService: SprintService) {}

  getAll = (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sprints = this.sprintService.getAllSprints();
      res.json(sprints);
    } catch (err) {
      next(err);
    }
  };

  create = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body;
      const id = this.sprintService.createSprint(name);
      res.json({ id });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = (req: Request, res: Response, next: NextFunction) => {
    try {
      this.sprintService.updateSprint(req.params.id as string, req.body);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  };
}
