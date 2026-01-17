import type { NextFunction, Request, Response } from "express";
import type { CiService } from "../services/ci.service.js";

export class CiController {
  constructor(private ciService: CiService) {}

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, preset } = req.body;
      const result = await this.ciService.runCi(taskId, preset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
