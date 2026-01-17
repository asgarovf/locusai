import type { NextFunction, Request, Response } from "express";
import type { EventRepository } from "../repositories/event.repository.js";

export class EventController {
  constructor(private eventRepo: EventRepository) {}

  getByTaskId = (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.query.taskId as string;
      const events = this.eventRepo.findByTaskId(taskId);
      const formattedEvents = events.map((e) => ({
        ...e,
        payload: JSON.parse(e.payload || "{}"),
      }));
      res.json(formattedEvents);
    } catch (err) {
      next(err);
    }
  };
}
