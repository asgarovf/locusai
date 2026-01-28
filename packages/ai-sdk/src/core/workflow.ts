import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIArtifact } from "@locusai/shared";
import { Intent } from "../chains/intent";
import { AgentMode, AgentResponse, AgentState } from "../interfaces/index";

export interface WorkflowContext {
  llm: BaseChatModel;
  state: AgentState;
  input: string;
  intent: Intent;
  workspaceId?: string;
}

export abstract class BaseWorkflow {
  abstract readonly name: string;
  abstract readonly mode: AgentMode;

  abstract canHandle(context: WorkflowContext): boolean;
  abstract execute(context: WorkflowContext): Promise<AgentResponse>;

  protected updateWorkflowState(state: AgentState, artifacts: AIArtifact[]) {
    if (!state.workflow) return;

    const newEntities = artifacts
      .filter((a) => ["document", "task", "sprint"].includes(a.type))
      .map((a) => ({
        id: a.id,
        type: a.type as "document" | "task" | "sprint",
        title: a.title,
        createdAt: new Date().toISOString(),
      }));

    for (const entity of newEntities) {
      if (!state.workflow.createdEntities.find((e) => e.id === entity.id)) {
        state.workflow.createdEntities.push(entity);
      }
    }
  }
}
