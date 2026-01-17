import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import type { ArtifactRepository } from "../repositories/artifact.repository.js";

export class ArtifactController {
  constructor(
    private artifactRepo: ArtifactRepository,
    private workspaceDir: string
  ) {}

  getArtifactFile = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, type, filename } = req.params;
      const filePath = join(
        this.workspaceDir,
        "artifacts",
        taskId as string,
        type as string,
        filename as string
      );

      if (!existsSync(filePath)) {
        return res
          .status(404)
          .json({ error: { message: "Artifact not found" } });
      }

      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  };

  getByTaskId = (req: Request, res: Response, next: NextFunction) => {
    try {
      const artifacts = this.artifactRepo.findByTaskId(
        req.params.taskId as string
      );
      res.json(artifacts);
    } catch (err) {
      next(err);
    }
  };
}
