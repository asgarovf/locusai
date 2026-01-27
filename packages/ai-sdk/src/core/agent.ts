import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { Runnable } from "@langchain/core/runnables";
import {
  type $FixMe,
  type AIArtifact,
  type SuggestedAction,
} from "@locusai/shared";
import { createIntentChain, Intent } from "../chains/intent";
import { createInterviewChain } from "../chains/interview";
import {
  AgentMode,
  type AgentResponse,
  type AgentState,
  type ProjectManifest,
} from "../interfaces/index";
import { getAgentTools } from "../tools/index";
import { ILocusProvider } from "../tools/interfaces";
import { DocumentCompiler } from "./compiler";
import { ContextManager } from "./context";
import { type LLMConfig, LLMFactory } from "./llm-factory";
import { ToolHandler } from "./tool-handler";

export interface AgentSettings extends LLMConfig {
  initialState?: Partial<AgentState>;
  locusProvider?: ILocusProvider;
  workspaceId?: string;
}

export class LocusAgent {
  private llm: BaseChatModel;
  private toolLLM: Runnable<$FixMe, $FixMe>;
  private state: AgentState;
  private locusProvider?: ILocusProvider;
  private workspaceId?: string;
  private toolHandler?: ToolHandler;
  private compiler?: DocumentCompiler;

  constructor(settings: AgentSettings = {}) {
    this.llm = LLMFactory.create(settings);
    this.locusProvider = settings.locusProvider;
    this.workspaceId = settings.workspaceId;

    if (this.locusProvider && this.workspaceId) {
      this.toolHandler = new ToolHandler(this.locusProvider, this.workspaceId);
      this.compiler = new DocumentCompiler(this.llm);

      // Bind tools
      if (typeof this.llm.bindTools === "function") {
        const tools = getAgentTools(
          this.locusProvider,
          this.workspaceId,
          this.compiler
        );
        this.toolLLM = this.llm.bindTools(tools);
      } else {
        this.toolLLM = this.llm;
      }
    } else {
      this.toolLLM = this.llm;
    }

    this.state = this.initializeState(settings.initialState);
  }

  private initializeState(initial?: Partial<AgentState>): AgentState {
    const defaultManifest: ProjectManifest = {
      name: "",
      mission: "",
      targetUsers: [],
      techStack: [],
      phase: "PLANNING",
      features: [],
      competitors: [],
      brandVoice: "",
      successMetrics: [],
      completenessScore: 0,
    };

    const manifest: ProjectManifest = {
      ...defaultManifest,
      ...initial?.manifest,
    };

    // Calculate missing info
    const requiredFields = [
      "name",
      "mission",
      "targetUsers",
      "techStack",
      "phase",
      "features",
      "competitors",
      "brandVoice",
      "successMetrics",
    ] as (keyof ProjectManifest)[];

    const missingInfo =
      initial?.missingInfo ||
      requiredFields.filter((key) => {
        const value = manifest[key];
        if (Array.isArray(value)) return value.length === 0;
        return !value;
      });

    return {
      mode: AgentMode.IDLE,
      scratchpad: [],
      manifest,
      missingInfo,
      history: [],
      ...initial,
    };
  }

  async handleMessage(input: string): Promise<AgentResponse> {
    // 1. Detect Intent
    const intent = await this.detectIntent(input);
    console.log(`[LocusAgent] Detected intent: ${intent}`);

    const isManifestComplete =
      !this.state.missingInfo || this.state.missingInfo.length === 0;

    // 2. Branch Logic
    if (this.shouldRunInterview(intent, isManifestComplete)) {
      return this.executeInterviewStep(input);
    }

    return this.executePlanningOrAction(input, intent, isManifestComplete);
  }

  private async detectIntent(input: string): Promise<Intent> {
    const intentChain = createIntentChain(this.llm);
    const historyText = this.state.history
      .slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const { intent } = await intentChain.invoke({
      input,
      history: historyText,
    });
    return intent;
  }

  private shouldRunInterview(
    intent: Intent,
    isManifestComplete: boolean
  ): boolean {
    return (
      (intent === Intent.INTERVIEW && !isManifestComplete) ||
      (this.state.missingInfo && this.state.missingInfo.length > 0)
    );
  }

  private async executeInterviewStep(input: string): Promise<AgentResponse> {
    const response = await this.runInterview(input);
    this.updateHistory("user", input);
    this.updateHistory(
      "assistant",
      response.content,
      undefined,
      response.suggestedActions
    );
    return response;
  }

  private async executePlanningOrAction(
    input: string,
    intent: Intent,
    isManifestComplete: boolean
  ): Promise<AgentResponse> {
    this.updateMode(intent, isManifestComplete);

    const projectContext = ContextManager.getProjectContext(this.state);
    const messages = ContextManager.buildMessages(
      this.state.history,
      input,
      projectContext
    );

    // First LLM Call
    const response = await (this.toolLLM as $FixMe).invoke(messages);

    // Handle Tool Calls
    if (response.tool_calls?.length && this.toolHandler) {
      const toolResult = await this.toolHandler.executeCalls(
        response.tool_calls
      );

      if (toolResult.observations.length > 0) {
        // Second LLM Call with Observations
        const systemPrompt = ContextManager.getToolExecutionSystemPrompt(
          projectContext,
          toolResult.observations
        );
        const finalMessages = ContextManager.buildMessages(
          this.state.history,
          input,
          systemPrompt
        );
        const finalResponse = await this.llm.invoke(finalMessages);

        const finalContent = finalResponse.content as string;

        this.updateHistory("user", input);
        this.updateHistory("assistant", finalContent, toolResult.artifacts);

        return {
          content: finalContent,
          artifacts: toolResult.artifacts,
          suggestedActions: toolResult.suggestedActions,
        };
      }
    }

    // Default Response
    const content = response.content as string;
    this.updateHistory("user", input);
    this.updateHistory("assistant", content);
    return { content };
  }

  private updateMode(intent: Intent, isManifestComplete: boolean) {
    let activeIntent = intent;
    if (activeIntent === Intent.INTERVIEW && isManifestComplete) {
      activeIntent = Intent.QUERY;
    }

    switch (activeIntent) {
      case Intent.PLANNING:
        this.state.mode = AgentMode.PLANNING;
        break;
      case Intent.ANALYSIS:
        this.state.mode = AgentMode.ANALYZING; // Wait for Phase 2 implementation
        break;
      case Intent.COMPILING:
        this.state.mode = AgentMode.EXECUTING; // Treat as executing for now
        break;
      default:
        this.state.mode = AgentMode.EXECUTING;
    }
  }

  private updateHistory(
    role: "user" | "assistant",
    content: string,
    artifacts?: AIArtifact[],
    suggestedActions?: SuggestedAction[]
  ) {
    this.state.history.push({ role, content, artifacts, suggestedActions });
  }

  private async runInterview(input: string): Promise<AgentResponse> {
    const interviewChain = createInterviewChain(this.llm);

    const historyText = this.state.history
      .slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    try {
      const result = await interviewChain.invoke({
        input,
        manifest: JSON.stringify(this.state.manifest),
        history: historyText,
      });

      // Update internal state
      this.state.manifest = result.manifest;
      this.state.missingInfo = result.missingInfo;
      this.state.mode =
        result.missingInfo.length === 0 ? AgentMode.IDLE : AgentMode.INTERVIEW;

      // Calculate completeness roughly
      const totalFields = 9;
      const filledFields = totalFields - (result.missingInfo?.length || 0);
      if (this.state.manifest) {
        const completenessScore = Math.round(
          (filledFields / totalFields) * 100
        );
        this.state.manifest.completenessScore =
          completenessScore < 0 ? 0 : completenessScore;
      }

      return {
        content: result.nextQuestion,
        suggestedActions: result.suggestedActions,
      };
    } catch (error) {
      console.error("[LocusAgent] Interview parsing failed:", error);
      // Fallback: If JSON parsing fails, try to get a raw response from the LLM
      // or at least return a graceful error message instead of crashing
      const fallbackResponse = await this.llm.invoke([
        ...this.state.history.slice(-5).map((m) => {
          if (m.role === "user") return new HumanMessage(m.content);
          return new AIMessage(m.content);
        }),
        new HumanMessage(input),
      ]);
      return { content: fallbackResponse.content as string };
    }
  }

  getState(): AgentState {
    return this.state;
  }
}
