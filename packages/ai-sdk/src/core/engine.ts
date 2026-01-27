import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createIntentChain, Intent } from "../chains/intent";
import { AgentResponse, AgentState } from "../interfaces/index";
import { BaseWorkflow, WorkflowContext } from "./workflow";

export class WorkflowEngine {
  private workflows: BaseWorkflow[] = [];

  constructor(
    private llm: BaseChatModel,
    private workspaceId?: string
  ) {}

  registerWorkflow(workflow: BaseWorkflow) {
    this.workflows.push(workflow);
  }

  async execute(state: AgentState, input: string): Promise<AgentResponse> {
    const intent = await this.detectIntent(state, input);

    const context: WorkflowContext = {
      llm: this.llm,
      state,
      input,
      intent,
      workspaceId: this.workspaceId,
    };

    // Find the first workflow that can handle the current context
    const workflow = this.workflows.find((w) => w.canHandle(context));

    if (!workflow) {
      throw new Error(
        `No workflow found to handle input with intent: ${intent}`
      );
    }

    console.log(
      `[WorkflowEngine] Intent: ${intent} -> Executing workflow: ${workflow.name}`
    );
    const response = await workflow.execute(context);

    // Update state mode if the workflow changed it
    state.mode = workflow.mode;

    return response;
  }

  private async detectIntent(
    state: AgentState,
    input: string
  ): Promise<Intent> {
    const intentChain = createIntentChain(this.llm);
    const historyText = state.history
      .slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    try {
      const result = await intentChain.invoke({
        input,
        history: historyText,
      });
      return result.intent;
    } catch (e) {
      console.warn(
        "[WorkflowEngine] Intent detection failed, falling back to QUERY:",
        e
      );
      return Intent.QUERY;
    }
  }
}
