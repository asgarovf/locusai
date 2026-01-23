import {
  AuthenticatedUser,
  EventType,
  getAuthUserId,
  ReportCiResult,
} from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { EventsService } from "@/events/events.service";

@Injectable()
export class CiService {
  constructor(private readonly eventsService: EventsService) {}

  async reportResult(data: ReportCiResult, user: AuthenticatedUser) {
    const { workspaceId, taskId, ...payload } = data;

    await this.eventsService.logEvent({
      workspaceId,
      taskId: taskId || null,
      userId: getAuthUserId(user),
      type: EventType.CI_RAN,
      payload: {
        ...payload,
        source: user.authType === "api_key" ? "api_key" : "local-cli",
        deferred: false,
        processed: true,
      },
    });

    return { success: true };
  }
}
