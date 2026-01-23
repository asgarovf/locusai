import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports
import {
  ApiKeyAuthUser,
  EventType,
  JwtAuthUser,
  UserRole,
} from "@locusai/shared";
import { Test, TestingModule } from "@nestjs/testing";
import { EventsService } from "@/events/events.service";
import { CiService } from "../ci.service";

describe("CiService", () => {
  let service: CiService;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CiService,
        {
          provide: EventsService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CiService>(CiService);
    eventsService = module.get(EventsService);
  });

  it("should log a CI_RAN event for a JWT user", async () => {
    const data = {
      workspaceId: "ws-1",
      taskId: "task-1",
      preset: "test",
      ok: true,
      summary: "All tests passed",
      commands: [{ cmd: "npm test", exitCode: 0 }],
    };

    const user: JwtAuthUser = {
      authType: "jwt",
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: UserRole.USER,
    };

    await service.reportResult(data, user);

    expect(eventsService.logEvent).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      taskId: "task-1",
      userId: "user-1",
      type: EventType.CI_RAN,
      payload: expect.objectContaining({
        preset: "test",
        ok: true,
        source: "local-cli",
      }),
    });
  });

  it("should log a CI_RAN event for an API key user", async () => {
    const data = {
      workspaceId: "ws-1",
      preset: "build",
      ok: true,
      summary: "Build successful",
      commands: [{ cmd: "npm run build", exitCode: 0 }],
    };

    const user: ApiKeyAuthUser = {
      authType: "api_key",
      apiKeyId: "key-1",
      apiKeyName: "CI Key",
      orgId: "org-1",
    };

    await service.reportResult(data, user);

    expect(eventsService.logEvent).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      taskId: null,
      userId: null,
      type: EventType.CI_RAN,
      payload: expect.objectContaining({
        preset: "build",
        ok: true,
        source: "api_key",
      }),
    });
  });
});
