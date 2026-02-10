import "reflect-metadata";
import "../../test-setup";
import { TaskPriority, TaskStatus } from "@locusai/shared";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Comment } from "@/entities/comment.entity";
import { Doc } from "@/entities/doc.entity";
import { Task } from "@/entities/task.entity";
import { Workspace } from "@/entities/workspace.entity";
import { EventsService } from "@/events/events.service";
import { TaskProcessor } from "../task.processor";
import { TasksService } from "../tasks.service";

describe("TasksService", () => {
  let service: TasksService;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn().mockImplementation(async (t) => t),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Doc),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Workspace),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: EventsService,
          useValue: { logEvent: jest.fn(), getByTaskId: jest.fn() },
        },
        {
          provide: TaskProcessor,
          useValue: { onStatusChanged: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepo = module.get(getRepositoryToken(Task));
    eventsService = module.get(EventsService);
    const workspaceRepo = module.get(getRepositoryToken(Workspace));
    workspaceRepo.findOne.mockResolvedValue({
      id: "ws-1",
      defaultChecklist: [{ id: "1", text: "bun run lint", done: false }],
    } as any);
  });

  it("should create a task with default checklist items", async () => {
    const data = {
      title: "Test Task",
      workspaceId: "ws-1",
      description: "",
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.MEDIUM,
      labels: [],
    };
    taskRepo.create.mockImplementation(
      (dto) => ({ id: "task-1", ...dto }) as any
    );
    taskRepo.save.mockImplementation(async (t) => t as any);

    const result = await service.create(data);

    expect(result.title).toBe("Test Task");
    expect(result.acceptanceChecklist).toContainEqual(
      expect.objectContaining({ text: "bun run lint" })
    );
    expect(eventsService.logEvent).toHaveBeenCalled();
  });

  it("should allow moving to DONE from IN_REVIEW", async () => {
    const task = {
      id: "task-1",
      status: TaskStatus.IN_REVIEW,
      title: "Test",
    };
    taskRepo.findOne.mockResolvedValue(task as any);

    const result = await service.update("task-1", { status: TaskStatus.DONE });

    expect(result.status).toBe(TaskStatus.DONE);
  });
});
