import { $FixMe, EventType } from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "@/entities/event.entity";

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>
  ) {}

  async logEvent<T extends EventType>(data: {
    workspaceId: string;
    taskId?: string | null;
    userId?: string | null;
    type: T;
    payload: Record<string, $FixMe>;
  }): Promise<Event> {
    const event = this.eventRepository.create(data as unknown as Event);
    const saved = await this.eventRepository.save(event);
    return (Array.isArray(saved) ? saved[0] : saved) as Event;
  }

  async getWorkspaceActivity(
    workspaceId: string,
    limit = 50
  ): Promise<Event[]> {
    return this.eventRepository.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
      take: limit,
      relations: ["user"],
    });
  }

  async getByTaskId(taskId: string): Promise<Event[]> {
    return this.eventRepository.find({
      where: { taskId },
      order: { createdAt: "DESC" },
      relations: ["user"],
    });
  }
}
