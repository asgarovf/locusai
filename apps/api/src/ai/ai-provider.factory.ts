import { ILocusProvider } from "@locusai/ai-sdk/src/tools/interfaces";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { DocsService } from "../docs/docs.service";
import { SprintsService } from "../sprints/sprints.service";
import { TasksService } from "../tasks/tasks.service";
import { DocAdapter } from "./adapters/doc.adapter";
import { SprintAdapter } from "./adapters/sprint.adapter";
import { TaskAdapter } from "./adapters/task.adapter";

@Injectable()
export class AiProviderFactory {
  constructor(
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => SprintsService))
    private readonly sprintsService: SprintsService,
    private readonly docsService: DocsService
  ) {}

  create(_workspaceId: string, userId: string): ILocusProvider {
    return {
      tasks: new TaskAdapter(this.tasksService, userId),
      sprints: new SprintAdapter(this.sprintsService, userId),
      docs: new DocAdapter(this.docsService),
    };
  }
}
