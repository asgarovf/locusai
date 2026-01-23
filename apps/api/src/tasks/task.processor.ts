import { EventType } from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task } from "@/entities/task.entity";
import { Workspace } from "@/entities/workspace.entity";
import { EventsService } from "@/events/events.service";

@Injectable()
export class TaskProcessor {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
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

    // Get workspace configuration
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: ["defaultChecklist"],
    });

    const defaultChecklist = workspace?.defaultChecklist;

    if (!defaultChecklist || defaultChecklist.length === 0) {
      return;
    }

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
