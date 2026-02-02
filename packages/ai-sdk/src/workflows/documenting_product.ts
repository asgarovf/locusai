import { Intent } from "../chains/intent";
import { ContextManager } from "../core/context";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import { AgentMode, AgentResponse } from "../interfaces/index";

export class ProductDocumentingWorkflow extends BaseWorkflow {
  readonly name = "Product Documenting";
  readonly mode = AgentMode.DOCUMENTING;

  canHandle(context: WorkflowContext): boolean {
    if (context.intent === Intent.PRODUCT_DOCUMENTING) return true;
    return (
      context.state.mode === AgentMode.DOCUMENTING &&
      context.intent === Intent.UNKNOWN
    );
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;

    const projectContext = ContextManager.getProjectContext(state);
    const messages = ContextManager.buildMessages(
      state.history,
      input,
      `${projectContext}\n\nYou are an expert Product Manager and Documentation Specialist.

Your role is to help with:
- Product Requirements Documents (PRD)
- User Stories and use cases
- Product roadmaps and timelines
- Feature specifications
- Budget and resource planning
- Market analysis and competitive research

Provide detailed, well-structured advice. Help users think through their product documentation needs and offer templates or frameworks when appropriate.`
    );

    const response = await llm.invoke(messages);
    const { cleanContent, actions } = this.extractAISuggestions(
      response.content as string
    );

    return {
      content: cleanContent,
      suggestedActions: actions,
    };
  }
}
