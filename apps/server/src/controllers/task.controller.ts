import { TaskSchema } from "@locus/shared";
import type { NextFunction, Request, Response } from "express";
import type { TaskService } from "../services/task.service.js";

export class TaskController {
  constructor(private taskService: TaskService) {}

  getAll = (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tasks = this.taskService.getAllTasks();
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  };

  getById = (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = this.taskService.getTaskById(req.params.id as string);
      res.json(task);
    } catch (err) {
      next(err);
    }
  };

  create = (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = TaskSchema.parse(req.body);
      const id = this.taskService.createTask(data);
      res.json({ id });
    } catch (err) {
      next(err);
    }
  };

  update = (req: Request, res: Response, next: NextFunction) => {
    try {
      this.taskService.updateTask(req.params.id as string, req.body);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  };

  delete = (req: Request, res: Response, next: NextFunction) => {
    try {
      this.taskService.deleteTask(req.params.id as string);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  };

  addComment = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { author, text } = req.body;
      this.taskService.addComment(req.params.id as string, author, text);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  };

  dispatch = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workerId, sprintId } = req.body;
      if (!sprintId) {
        return res
          .status(400)
          .json({ error: { message: "sprintId is required" } });
      }
      const task = this.taskService.dispatchTask(workerId, Number(sprintId));
      res.json(task);
    } catch (err) {
      next(err);
    }
  };

  lock = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId, ttlSeconds } = req.body;
      this.taskService.lockTask(req.params.id as string, agentId, ttlSeconds);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  };

  unlock = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.body;
      this.taskService.unlockTask(req.params.id as string, agentId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  };
}
