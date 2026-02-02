import { Intent } from "../chains/intent";
import { ContextManager } from "../core/context";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import { AgentMode, AgentResponse } from "../interfaces/index";

export class TechnicalDocumentingWorkflow extends BaseWorkflow {
  readonly name = "Technical Documenting";
  readonly mode = AgentMode.DOCUMENTING;

  canHandle(context: WorkflowContext): boolean {
    if (context.intent === Intent.TECHNICAL_DOCUMENTING) return true;
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
      `${projectContext}\n\nYou are an expert Software Architect and Technical Documentation Specialist.

Your role is to help with:
- Technical Specifications and Architecture Documents
- System Design and diagrams (describe diagrams in text/markdown)
- Database schemas and data models
- API specifications and contracts
- Sequence diagrams and user flows
- Infrastructure and deployment documentation

Provide detailed, well-structured technical guidance. Use proper technical terminology and help users think through their architectural decisions.`
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
