import "reflect-metadata";
import "../../test-setup";
import { EventType } from "@locusai/shared";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "@/entities/event.entity";
import { EventsService } from "../events.service";

describe("EventsService", () => {
  let service: EventsService;
  let repository: jest.Mocked<Repository<Event>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    repository = module.get(getRepositoryToken(Event));
  });

  it("should log an event", async () => {
    const eventData = {
      workspaceId: "ws-1",
      type: EventType.TASK_CREATED,
      payload: { title: "Test Task" },
    };
    const mockEvent = { id: "evt-1", ...eventData };

    repository.create.mockReturnValue(mockEvent as any);
    repository.save.mockResolvedValue(mockEvent as any);

    const result = await service.logEvent(eventData);

    expect(result).toEqual(mockEvent);
    expect(repository.create).toHaveBeenCalledWith(eventData);
    expect(repository.save).toHaveBeenCalledWith(mockEvent);
  });

  it("should get workspace activity", async () => {
    const workspaceId = "ws-1";
    const mockEvents = [{ id: "evt-1", workspaceId }];

    repository.find.mockResolvedValue(mockEvents as any);

    const result = await service.getWorkspaceActivity(workspaceId);

    expect(result).toEqual(mockEvents);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId },
        order: { createdAt: "DESC" },
      })
    );
  });
});
