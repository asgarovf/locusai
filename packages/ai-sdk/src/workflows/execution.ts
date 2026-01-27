import { $FixMe, SuggestedAction } from "@locusai/shared";
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

    const response = await toolLLM.invoke(messages);

    if (response.tool_calls?.length > 0) {
      const toolResult = await this.toolHandler.executeCalls(
        response.tool_calls
      );

      if (toolResult.observations.length > 0) {
        const systemPrompt = ContextManager.getToolExecutionSystemPrompt(
          projectContext,
          toolResult.observations
        );
        const finalMessages = ContextManager.buildMessages(
          state.history,
          input,
          systemPrompt
        );
        const finalResponse = await llm.invoke(finalMessages);
        const content = finalResponse.content as string;

        const { cleanContent, actions } = this.extractAISuggestions(content);

        return {
          content: cleanContent,
          artifacts: toolResult.artifacts,
          suggestedActions: [
            ...(toolResult.suggestedActions || []),
            ...(actions || []),
          ],
        };
      }
    }

    const { cleanContent, actions } = this.extractAISuggestions(
      response.content as string
    );

    return {
      content: cleanContent,
      suggestedActions: actions,
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
