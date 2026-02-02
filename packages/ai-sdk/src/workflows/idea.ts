import { Intent } from "../chains/intent";
import { ContextManager } from "../core/context";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import { AgentMode, AgentResponse } from "../interfaces/index";

export class IdeaWorkflow extends BaseWorkflow {
  readonly name = "Idea";
  readonly mode = AgentMode.IDEA;

  canHandle(context: WorkflowContext): boolean {
    if (context.intent === Intent.IDEA) return true;
    return (
      context.state.mode === AgentMode.IDEA && context.intent === Intent.UNKNOWN
    );
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;

    const projectContext = ContextManager.getProjectContext(state);
    const messages = ContextManager.buildMessages(
      state.history,
      input,
      `${projectContext}\n\nYou are a creative AI assistant helping with brainstorming and ideation for software projects.

Your role is to:
- Help explore and develop new ideas
- Provide creative suggestions and alternatives
- Discuss pros and cons of different approaches
- Help think through implementation strategies
- Offer insights based on best practices

Be creative, thoughtful, and engaging in your responses while keeping suggestions practical and actionable.`
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
