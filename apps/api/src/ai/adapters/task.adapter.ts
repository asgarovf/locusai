import { ITaskProvider } from "@locusai/ai-sdk/src/tools/interfaces";
import { CreateTask, Task, UpdateTask } from "@locusai/shared";
import { Task as TaskEntity } from "@/entities";
import { TasksService } from "../../tasks/tasks.service";

export class TaskAdapter implements ITaskProvider {
  constructor(
    private readonly tasksService: TasksService,
    private readonly userId: string
  ) {}

  async create(
    workspaceId: string,
    data: CreateTask & { userId?: string; workspaceId?: string }
  ): Promise<Task> {
    const task = await this.tasksService.create({
      ...data,
      workspaceId,
      userId: this.userId,
    });
    return this.mapToShared(task);
  }

  async update(
    id: string,
    _workspaceId: string,
    data: UpdateTask
  ): Promise<Task> {
    const task = await this.tasksService.update(
      id,
      data as Partial<UpdateTask>,
      this.userId
    );
    return this.mapToShared(task);
  }

  async batchUpdate(
    ids: string[],
    workspaceId: string,
    data: UpdateTask
  ): Promise<void> {
    await this.tasksService.batchUpdate(
      ids,
      workspaceId,
      data as Partial<UpdateTask>
    );
  }

  async list(workspaceId: string): Promise<Task[]> {
    const tasks = await this.tasksService.findRelevantTasks(workspaceId);
    return tasks.map((t) => this.mapToShared(t));
  }

  async getById(id: string, _workspaceId: string): Promise<Task> {
    const task = await this.tasksService.findById(id);
    return this.mapToShared(task);
  }

  private mapToShared(task: TaskEntity): Task {
    return {
      ...task,
      dueDate: task.dueDate ? task.dueDate.getTime() : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    } as Task;
  }
}
