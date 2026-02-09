import "reflect-metadata";
import "../../test-setup";
import { SprintStatus, TaskStatus } from "@locusai/shared";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Sprint } from "@/entities/sprint.entity";
import { EventsService } from "@/events/events.service";
import { TasksService } from "@/tasks/tasks.service";
import { SprintsService } from "../sprints.service";

describe("SprintsService", () => {
  let service: SprintsService;
  let repository: jest.Mocked<Repository<Sprint>>;
  let eventsService: jest.Mocked<EventsService>;
  let mockTaskRepository: any;

  beforeEach(async () => {
    mockTaskRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

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
            manager: {
              getRepository: jest.fn().mockReturnValue(mockTaskRepository),
            },
          },
        },
        {
          provide: EventsService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
        {
          provide: TasksService,
          useValue: {
            batchUpdate: jest.fn(),
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

  describe("completeSprint", () => {
    it("should complete a sprint and move VERIFICATION tasks to DONE", async () => {
      const sprintId = "sprint-1";
      const workspaceId = "ws-1";
      const sprint = {
        id: sprintId,
        workspaceId,
        status: SprintStatus.ACTIVE,
        name: "Sprint 1",
      };

      const tasksInSprint = [
        {
          id: "task-1",
          sprintId,
          title: "Task 1",
          status: TaskStatus.VERIFICATION,
          workspaceId,
        },
        {
          id: "task-2",
          sprintId,
          title: "Task 2",
          status: TaskStatus.DONE,
          workspaceId,
        },
      ];

      repository.findOne.mockResolvedValue(sprint as any);
      repository.save.mockResolvedValue({
        ...sprint,
        status: SprintStatus.COMPLETED,
      } as any);
      mockTaskRepository.find.mockResolvedValue(tasksInSprint);
      mockTaskRepository.save.mockImplementation(async (tasks) => tasks);

      const result = await service.completeSprint(sprintId, "user-1");

      expect(result.status).toBe(SprintStatus.COMPLETED);
      expect(mockTaskRepository.find).toHaveBeenCalledWith({
        where: { sprintId },
      });
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "task-1",
            status: TaskStatus.DONE,
          }),
        ])
      );
      expect(eventsService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "STATUS_CHANGED",
          taskId: "task-1",
          payload: expect.objectContaining({
            oldStatus: TaskStatus.VERIFICATION,
            newStatus: TaskStatus.DONE,
          }),
        })
      );
    });

    it("should move IN_PROGRESS tasks to BACKLOG and remove sprint association and assignee", async () => {
      const sprintId = "sprint-1";
      const workspaceId = "ws-1";
      const sprint = {
        id: sprintId,
        workspaceId,
        status: SprintStatus.ACTIVE,
        name: "Sprint 1",
      };

      const tasksInSprint = [
        {
          id: "task-1",
          sprintId,
          title: "Task 1",
          status: TaskStatus.IN_PROGRESS,
          assignedTo: "worker-1",
          workspaceId,
        },
      ];

      repository.findOne.mockResolvedValue(sprint as any);
      repository.save.mockResolvedValue({
        ...sprint,
        status: SprintStatus.COMPLETED,
      } as any);
      mockTaskRepository.find.mockResolvedValue(tasksInSprint);
      mockTaskRepository.save.mockImplementation(async (tasks) => tasks);

      await service.completeSprint(sprintId, "user-1");

      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "task-1",
            status: TaskStatus.BACKLOG,
            sprintId: null,
            assignedTo: null,
          }),
        ])
      );
      expect(eventsService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "STATUS_CHANGED",
          taskId: "task-1",
          payload: expect.objectContaining({
            oldStatus: TaskStatus.IN_PROGRESS,
            newStatus: TaskStatus.BACKLOG,
          }),
        })
      );
    });

    it("should not modify tasks with other statuses", async () => {
      const sprintId = "sprint-1";
      const workspaceId = "ws-1";
      const sprint = {
        id: sprintId,
        workspaceId,
        status: SprintStatus.ACTIVE,
        name: "Sprint 1",
      };

      const tasksInSprint = [
        {
          id: "task-1",
          sprintId,
          title: "Task 1",
          status: TaskStatus.DONE,
          workspaceId,
        },
        {
          id: "task-2",
          sprintId,
          title: "Task 2",
          status: TaskStatus.BACKLOG,
          workspaceId,
        },
      ];

      repository.findOne.mockResolvedValue(sprint as any);
      repository.save.mockResolvedValue({
        ...sprint,
        status: SprintStatus.COMPLETED,
      } as any);
      mockTaskRepository.find.mockResolvedValue(tasksInSprint);
      mockTaskRepository.save.mockImplementation(async (tasks) => tasks);

      await service.completeSprint(sprintId, "user-1");

      // Should not be called at all since no tasks need updating
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it("should handle multiple tasks with different statuses correctly", async () => {
      const sprintId = "sprint-1";
      const workspaceId = "ws-1";
      const sprint = {
        id: sprintId,
        workspaceId,
        status: SprintStatus.ACTIVE,
        name: "Sprint 1",
      };

      const tasksInSprint = [
        {
          id: "task-1",
          sprintId,
          title: "Task 1",
          status: TaskStatus.VERIFICATION,
          workspaceId,
        },
        {
          id: "task-2",
          sprintId,
          title: "Task 2",
          status: TaskStatus.IN_PROGRESS,
          assignedTo: "worker-1",
          workspaceId,
        },
        {
          id: "task-3",
          sprintId,
          title: "Task 3",
          status: TaskStatus.DONE,
          workspaceId,
        },
      ];

      repository.findOne.mockResolvedValue(sprint as any);
      repository.save.mockResolvedValue({
        ...sprint,
        status: SprintStatus.COMPLETED,
      } as any);
      mockTaskRepository.find.mockResolvedValue(tasksInSprint);
      mockTaskRepository.save.mockImplementation(async (tasks) => tasks);

      await service.completeSprint(sprintId, "user-1");

      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "task-1",
            status: TaskStatus.DONE,
          }),
          expect.objectContaining({
            id: "task-2",
            status: TaskStatus.BACKLOG,
            sprintId: null,
            assignedTo: null,
          }),
        ])
      );
      expect(mockTaskRepository.save).toHaveBeenCalledTimes(1); // Bulk save called once
    });
  });
});
