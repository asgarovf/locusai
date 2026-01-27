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
import { createCreateTaskTool, createListTasksTool } from "./tasks";

export const getAgentTools = (
  provider: ILocusProvider,
  workspaceId: string,
  compiler?: DocumentCompiler
): DynamicStructuredTool[] => {
  const tools: DynamicStructuredTool[] = [
    createCreateTaskTool(provider.tasks, workspaceId),
    createListTasksTool(provider.tasks, workspaceId),
    createReadDocTool(provider.docs, workspaceId),
    createListDocsTool(provider.docs, workspaceId),
    createCreateDocTool(provider.docs, workspaceId),
    createUpdateDocTool(provider.docs, workspaceId),
    createCreateSprintTool(provider.sprints, workspaceId),
    createListSprintsTool(provider.sprints, workspaceId),
    createPlanSprintTool(provider.sprints, workspaceId),
  ];

  if (compiler) {
    tools.push(createCompileDocumentTool(compiler, provider.docs, workspaceId));
  }

  return tools;
};
