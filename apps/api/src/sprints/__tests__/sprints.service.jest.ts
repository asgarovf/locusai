import "reflect-metadata";
import "../../test-setup";
import { SprintStatus } from "@locusai/shared";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sprint } from "@/entities/sprint.entity";
import { EventsService } from "@/events/events.service";
import { SprintsService } from "../sprints.service";

describe("SprintsService", () => {
  let service: SprintsService;
  let repository: jest.Mocked<Repository<Sprint>>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        {
          provide: getRepositoryToken(Sprint),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
    repository = module.get(getRepositoryToken(Sprint));
    eventsService = module.get(EventsService);
  });

  it("should create a sprint and log an event", async () => {
    const data = { name: "Sprint 1", workspaceId: "ws-1", userId: "user-1" };
    const mockSprint = {
      id: "sprint-1",
      ...data,
      status: SprintStatus.PLANNED,
    };

    repository.create.mockReturnValue(mockSprint as any);
    repository.save.mockResolvedValue(mockSprint as any);

    const result = await service.create(data);

    expect(result).toEqual(mockSprint);
    expect(eventsService.logEvent).toHaveBeenCalled();
  });

  it("should start a sprint and complete the previous active one", async () => {
    const workspaceId = "ws-1";
    const activeSprint = {
      id: "active-1",
      workspaceId,
      status: SprintStatus.ACTIVE,
    };
    const newSprint = {
      id: "new-1",
      workspaceId,
      status: SprintStatus.PLANNED,
    };

    repository.findOne.mockResolvedValueOnce(newSprint as any); // findById
    repository.findOne.mockResolvedValueOnce(activeSprint as any); // findActive
    repository.save.mockImplementation(async (s) => s as any);

    const result = await service.startSprint("new-1", "user-1");

    expect(result.status).toBe(SprintStatus.ACTIVE);
    expect(activeSprint.status).toBe(SprintStatus.COMPLETED);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });
});
