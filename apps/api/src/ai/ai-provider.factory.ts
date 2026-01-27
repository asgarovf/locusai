import { ILocusProvider } from "@locusai/ai-sdk/src/tools/interfaces";
import { CreateSprint, Task as SharedTask, UpdateTask } from "@locusai/shared";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { Task as TaskEntity } from "@/entities";
import { DocsService } from "../docs/docs.service";
import { SprintsService } from "../sprints/sprints.service";
import { TasksService } from "../tasks/tasks.service";

@Injectable()
export class AiProviderFactory {
  constructor(
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => SprintsService))
    private readonly sprintsService: SprintsService,
    private readonly docsService: DocsService
  ) {}

  create(_workspaceId: string): ILocusProvider {
    return {
      tasks: {
        create: async (wid, data) =>
          this.mapTaskToShared(
            await this.tasksService.create({ ...data, workspaceId: wid })
          ),
        update: async (id, _wid, data) =>
          this.mapTaskToShared(
            await this.tasksService.update(id, data as Partial<UpdateTask>)
          ),
        batchUpdate: async (ids, wid, data) =>
          this.tasksService.batchUpdate(ids, wid, data as Partial<UpdateTask>),
        list: async (wid) =>
          this.mapTasksToShared(await this.tasksService.findRelevantTasks(wid)),
        getById: async (id) =>
          this.mapTaskToShared(await this.tasksService.findById(id)),
      },
      sprints: {
        create: (wid, data: CreateSprint) =>
          this.sprintsService.create({
            ...data,
            workspaceId: wid,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
          }),
        list: (wid) => this.sprintsService.findAll(wid),
        getById: (id) => this.sprintsService.findById(id),
        plan: (wid, sid) => this.sprintsService.planSprintWithAi(sid, wid),
      },
      docs: {
        create: (wid, data) =>
          this.docsService.create({ ...data, workspaceId: wid }),
        update: (id, _wid, data) => this.docsService.update(id, data),
        list: (wid) => this.docsService.findByWorkspace(wid),
        getById: (id) => this.docsService.findById(id),
      },
    };
  }

  private mapTaskToShared(task: TaskEntity): SharedTask {
    return {
      ...task,
      dueDate: task.dueDate ? task.dueDate.getTime() : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    } as SharedTask;
  }

  private mapTasksToShared(tasks: TaskEntity[]): SharedTask[] {
    return tasks.map((t) => this.mapTaskToShared(t));
  }
}
