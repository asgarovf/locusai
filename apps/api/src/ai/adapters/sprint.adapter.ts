import { ISprintProvider } from "@locusai/ai-sdk/src/tools/interfaces";
import { CreateSprint, Sprint } from "@locusai/shared";
import { SprintsService } from "../../sprints/sprints.service";

export class SprintAdapter implements ISprintProvider {
  constructor(
    private readonly sprintsService: SprintsService,
    private readonly userId: string
  ) {}

  async create(workspaceId: string, data: CreateSprint): Promise<Sprint> {
    return this.sprintsService.create({
      ...data,
      workspaceId,
      userId: this.userId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
  }

  async list(workspaceId: string): Promise<Sprint[]> {
    return this.sprintsService.findAll(workspaceId);
  }

  async getById(id: string, _workspaceId: string): Promise<Sprint> {
    return this.sprintsService.findById(id);
  }

  async plan(workspaceId: string, sprintId: string): Promise<Sprint> {
    return this.sprintsService.planSprintWithAi(sprintId, workspaceId);
  }
}
