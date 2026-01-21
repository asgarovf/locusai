import { EventType, ReportCiResult } from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { EventsService } from "@/events/events.service";

@Injectable()
export class CiService {
  constructor(private readonly eventsService: EventsService) {}

  async reportResult(data: ReportCiResult, userId?: string) {
    const { workspaceId, taskId, ...payload } = data;

    await this.eventsService.logEvent({
      workspaceId,
      taskId: taskId || null,
      userId: userId || null,
      type: EventType.CI_RAN,
      payload: {
        ...payload,
        source: "local-cli",
        deferred: false,
        processed: true,
      },
    });

    return { success: true };
  }
}
