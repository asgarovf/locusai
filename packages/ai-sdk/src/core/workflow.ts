import { BaseChatModel } from "@langchain/core/language_models/chat_models";
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
}
