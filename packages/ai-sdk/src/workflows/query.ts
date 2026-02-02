import { Intent } from "../chains/intent";
import { ContextManager } from "../core/context";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import { AgentMode, AgentResponse } from "../interfaces/index";

export class QueryWorkflow extends BaseWorkflow {
  readonly name = "Query";
  readonly mode = AgentMode.QUERY;

  canHandle(context: WorkflowContext): boolean {
    if (context.intent === Intent.QUERY) return true;
    return (
      context.state.mode === AgentMode.QUERY &&
      context.intent === Intent.UNKNOWN
    );
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;

    const projectContext = ContextManager.getProjectContext(state);
    const messages = ContextManager.buildMessages(
      state.history,
      input,
      `${projectContext}\n\nYou are a helpful AI assistant for project management and software development.

Your role is to:
- Answer questions about the project
- Provide advice and guidance
- Help brainstorm and discuss ideas
- Assist with documentation and planning discussions

Be helpful, concise, and professional in your responses.`
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
