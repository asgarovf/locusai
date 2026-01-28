import { HumanMessage } from "@langchain/core/messages";
import { $FixMe, AIArtifact, SuggestedAction } from "@locusai/shared";
import { DocumentCompiler } from "../core/compiler";
import { ContextManager } from "../core/context";
import { ToolHandler } from "../core/tool-handler";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import { AgentMode, AgentResponse } from "../interfaces/index";
import { getAgentTools } from "../tools/index";
import { ILocusProvider } from "../tools/interfaces";

export class ExecutionWorkflow extends BaseWorkflow {
  readonly name = "Execution";
  readonly mode = AgentMode.EXECUTING;

  constructor(
    private provider: ILocusProvider,
    private workspaceId: string,
    private toolHandler: ToolHandler,
    private compiler: DocumentCompiler
  ) {
    super();
  }

  canHandle(_context: WorkflowContext): boolean {
    // This is typically the fallback workflow for planning, execution, and general queries
    return true;
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;

    // Build tools - we need to bind them to the LLM if not already
    const tools = getAgentTools(this.provider, this.workspaceId, this.compiler);
    const toolLLM = (llm as $FixMe).bindTools
      ? (llm as $FixMe).bindTools(tools)
      : llm;

    const projectContext = ContextManager.getProjectContext(state);
    const messages = ContextManager.buildMessages(
      state.history,
      input,
      projectContext
    );

    let steps = 0;
    const maxSteps = 5;
    const allArtifacts: AIArtifact[] = [];
    const allSuggestedActions: SuggestedAction[] = [];

    // Loop for multi-step execution (ReAct pattern)
    while (steps < maxSteps) {
      steps++;

      const response = await toolLLM.invoke(messages);
      messages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        // Agent is done, just talking
        const { cleanContent, actions } = this.extractAISuggestions(
          response.content as string
        );
        return {
          content: cleanContent,
          artifacts: allArtifacts,
          suggestedActions: [...allSuggestedActions, ...actions],
        };
      }

      // Execute tools
      const toolResult = await this.toolHandler.executeCalls(
        response.tool_calls
      );

      // Accumulate side effects
      if (toolResult.artifacts) allArtifacts.push(...toolResult.artifacts);
      if (toolResult.suggestedActions)
        allSuggestedActions.push(...toolResult.suggestedActions);

      const observationText = toolResult.observations.join("\n\n");

      // We'll append a generic "Tool Output" as a Human Message or System Message if we can't do ToolMessage.
      messages.push(
        new HumanMessage(
          `Tool Execution Result:\n${observationText}\n\nContinue executing if needed, or answer the user.`
        )
      );

      // Continue loop to let LLM decide next step
    }

    // Fallback if max steps reached
    return {
      content: "Execution limit reached. check the logs.",
      artifacts: allArtifacts,
      suggestedActions: allSuggestedActions,
    };
  }

  private extractAISuggestions(content: string): {
    cleanContent: string;
    actions: SuggestedAction[];
  } {
    const suggestionsMatch = content.match(
      /<suggestions>([\s\S]*?)<\/suggestions>/
    );
    if (!suggestionsMatch) {
      return { cleanContent: content, actions: [] };
    }

    try {
      const actionsJson = JSON.parse(suggestionsMatch[1]);
      const actions = actionsJson.map((a: { label: string; text: string }) => ({
        label: a.label,
        type: "chat_suggestion",
        payload: { text: a.text },
      }));

      const cleanContent = content
        .replace(/<suggestions>[\s\S]*?<\/suggestions>/, "")
        .trim();

      return { cleanContent, actions };
    } catch (e) {
      console.warn("[ExecutionWorkflow] Failed to parse suggested actions:", e);
      return { cleanContent: content, actions: [] };
    }
  }
}
