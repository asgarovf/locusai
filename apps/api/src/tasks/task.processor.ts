import { EventType } from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task } from "@/entities/task.entity";
import { EventsService } from "@/events/events.service";

@Injectable()
export class TaskProcessor {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly eventsService: EventsService
  ) {}

  async onStatusChanged(taskId: string, _from: string, to: string) {
    if (to === "IN_PROGRESS") {
      await this.handleInProgress(taskId);
    }
  }

  private async handleInProgress(taskId: string) {
    try {
      const task = await this.taskRepository.findOne({ where: { id: taskId } });
      if (!task) return;

      // Initialize acceptance checklist if empty
      await this.initChecklist(
        taskId,
        task.workspaceId,
        task.acceptanceChecklist || []
      );
    } catch (err) {
      console.error("[TaskProcessor] Error in handleInProgress:", err);
    }
  }

  private async initChecklist(
    taskId: string,
    workspaceId: string,
    current: Array<{ id: string; text: string; done: boolean }>
  ) {
    if (current && current.length > 0) return;

    const defaultChecklist = [
      { id: "step-1", text: "Research & Planning", done: false },
      { id: "step-2", text: "Implementation", done: false },
      { id: "step-3", text: "Testing & Verification", done: false },
      {
        id: `quality-lint-${Date.now()}`,
        text: "bun run lint",
        done: false,
      },
      {
        id: `quality-typecheck-${Date.now()}`,
        text: "bun run typecheck",
        done: false,
      },
    ];

    await this.taskRepository.update(taskId, {
      acceptanceChecklist: defaultChecklist,
    });

    await this.eventsService.logEvent({
      workspaceId,
      taskId,
      type: EventType.CHECKLIST_INITIALIZED,
      payload: { itemCount: defaultChecklist.length },
    });
  }
}
