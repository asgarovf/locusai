import { ILocusProvider } from "@locusai/ai-sdk/src/tools/interfaces";
import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { DocsService } from "../docs/docs.service";
import type { SprintsService } from "../sprints/sprints.service";
import { TasksService } from "../tasks/tasks.service";
import { DocAdapter } from "./adapters/doc.adapter";
import { SprintAdapter } from "./adapters/sprint.adapter";
import { TaskAdapter } from "./adapters/task.adapter";

@Injectable()
export class AiProviderFactory {
  constructor(
    private readonly tasksService: TasksService,
    private readonly docsService: DocsService,
    private readonly moduleRef: ModuleRef
  ) {}

  create(_workspaceId: string, userId: string): ILocusProvider {
    const sprintsService = this.moduleRef.get("SprintsService", {
      strict: false,
    }) as SprintsService;
    return {
      tasks: new TaskAdapter(this.tasksService, userId),
      sprints: new SprintAdapter(sprintsService, userId),
      docs: new DocAdapter(this.docsService),
    };
  }
}
