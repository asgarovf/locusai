import { DynamicStructuredTool } from "@langchain/core/tools";
import { DocumentCompiler } from "../core/compiler";
import { createCompileDocumentTool } from "./compiler";
import {
  createCreateDocTool,
  createListDocsTool,
  createReadDocTool,
  createUpdateDocTool,
} from "./docs";
import { ILocusProvider } from "./interfaces";
import {
  createCreateSprintTool,
  createListSprintsTool,
  createPlanSprintTool,
} from "./sprints";
import {
  createBatchUpdateTasksTool,
  createCreateTaskTool,
  createListTasksTool,
  createUpdateTaskTool,
} from "./tasks";

export class ToolRegistry {
  constructor(
    private provider: ILocusProvider,
    private workspaceId: string,
    private compiler?: DocumentCompiler
  ) {}

  getTaskTools(): DynamicStructuredTool[] {
    return [
      createCreateTaskTool(this.provider.tasks, this.workspaceId),
      createUpdateTaskTool(this.provider.tasks, this.workspaceId),
      createBatchUpdateTasksTool(
        this.provider.tasks,
        this.provider.sprints,
        this.workspaceId
      ),
      createListTasksTool(this.provider.tasks, this.workspaceId),
    ];
  }

  getSprintTools(): DynamicStructuredTool[] {
    return [
      createCreateSprintTool(this.provider.sprints, this.workspaceId),
      createListSprintsTool(this.provider.sprints, this.workspaceId),
      createPlanSprintTool(this.provider.sprints, this.workspaceId),
    ];
  }

  getDocTools(): DynamicStructuredTool[] {
    return [
      createReadDocTool(this.provider.docs, this.workspaceId),
      createListDocsTool(this.provider.docs, this.workspaceId),
      createCreateDocTool(this.provider.docs, this.workspaceId),
      createUpdateDocTool(this.provider.docs, this.workspaceId),
    ];
  }

  getCompilerTools(): DynamicStructuredTool[] {
    if (!this.compiler) return [];
    return [
      createCompileDocumentTool(
        this.compiler,
        this.provider.docs,
        this.provider.tasks,
        this.workspaceId
      ),
    ];
  }

  getAllTools(): DynamicStructuredTool[] {
    return [
      ...this.getTaskTools(),
      ...this.getDocTools(),
      ...this.getSprintTools(),
      ...this.getCompilerTools(),
    ];
  }
}
