import { HumanMessage } from "@langchain/core/messages";
import { $FixMe, AIArtifact, SuggestedAction } from "@locusai/shared";
import { Intent } from "../chains/intent";
import { DocumentCompiler } from "../core/compiler";
import { ContextManager } from "../core/context";
import { ToolHandler } from "../core/tool-handler";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import { AgentMode, AgentResponse } from "../interfaces/index";
import { ToolRegistry } from "../tools/index";
import { ILocusProvider } from "../tools/interfaces";

export class TechnicalDocumentingWorkflow extends BaseWorkflow {
  readonly name = "Technical Documenting";
  readonly mode = AgentMode.DOCUMENTING;

  constructor(
    private provider: ILocusProvider,
    private workspaceId: string,
    private toolHandler: ToolHandler,
    private compiler: DocumentCompiler
  ) {
    super();
  }

  canHandle(context: WorkflowContext): boolean {
    if (context.intent === Intent.TECHNICAL_DOCUMENTING) return true;
    return (
      context.state.mode === AgentMode.DOCUMENTING &&
      context.intent === Intent.UNKNOWN
    );
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;

    const registry = new ToolRegistry(
      this.provider,
      this.workspaceId,
      this.compiler
    );
    const tools = [
      ...registry.getDocTools(),
      ...registry.getTaskTools(),
      ...registry.getSprintTools(),
    ];

    const toolLLM = (llm as $FixMe).bindTools
      ? (llm as $FixMe).bindTools(tools)
      : llm;

    const projectContext = ContextManager.getProjectContext(state);
    const messages = ContextManager.buildMessages(
      state.history,
      input,
      `${projectContext}\n\nYou are in Technical Documenting mode. Focus on creating or updating Technical Specifications, Architecture Diagrams, schemas, and Sequence Flows. Use 'create_document' with type='TECH_SPEC' when starting a new document.`
    );

    let steps = 0;
    const maxSteps = 5;
    const allArtifacts: AIArtifact[] = [];
    const allSuggestedActions: SuggestedAction[] = [];

    while (steps < maxSteps) {
      steps++;

      const response = await toolLLM.invoke(messages);
      messages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        const { cleanContent, actions } = this.extractAISuggestions(
          response.content
        );
        return {
          content: cleanContent,
          artifacts: Array.from(
            new Map(allArtifacts.map((a) => [a.id, a])).values()
          ),
          suggestedActions: [...allSuggestedActions, ...actions],
        };
      }

      const toolResult = await this.toolHandler.executeCalls(
        response.tool_calls
      );

      if (toolResult.artifacts) allArtifacts.push(...toolResult.artifacts);
      if (toolResult.suggestedActions)
        allSuggestedActions.push(...toolResult.suggestedActions);

      const observationText = toolResult.observations.join("\n\n");

      messages.push(
        new HumanMessage(
          `Tool Execution Result:\n${observationText}\n\nContinue executing if needed, or answer the user.`
        )
      );
    }

    return {
      content: "Execution limit reached.",
      artifacts: Array.from(
        new Map(allArtifacts.map((a) => [a.id, a])).values()
      ),
      suggestedActions: allSuggestedActions,
    };
  }
}
