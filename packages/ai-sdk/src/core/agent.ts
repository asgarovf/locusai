import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { type AIArtifact, type SuggestedAction } from "@locusai/shared";
import {
  AgentMode,
  type AgentResponse,
  type AgentState,
  type ProjectManifest,
} from "../interfaces/index";
import { ILocusProvider } from "../tools/interfaces";
import { ExecutionWorkflow } from "../workflows/execution";
import { InterviewWorkflow } from "../workflows/interview";
import { DocumentCompiler } from "./compiler";
import { WorkflowEngine } from "./engine";
import { type LLMConfig, LLMFactory } from "./llm-factory";
import { ToolHandler } from "./tool-handler";

export interface AgentSettings extends LLMConfig {
  initialState?: Partial<AgentState>;
  locusProvider?: ILocusProvider;
  workspaceId?: string;
}

export class LocusAgent {
  private llm: BaseChatModel;
  private state: AgentState;
  private locusProvider?: ILocusProvider;
  private workspaceId?: string;
  private toolHandler?: ToolHandler;
  private compiler?: DocumentCompiler;
  private engine: WorkflowEngine;

  constructor(settings: AgentSettings = {}) {
    this.llm = LLMFactory.create(settings);
    this.locusProvider = settings.locusProvider;
    this.workspaceId = settings.workspaceId;
    this.state = this.initializeState(settings.initialState);

    this.engine = new WorkflowEngine(this.llm, this.workspaceId);
    this.setupWorkflows();
  }

  private setupWorkflows() {
    this.engine.registerWorkflow(new InterviewWorkflow());

    if (this.locusProvider && this.workspaceId) {
      this.toolHandler = new ToolHandler(this.locusProvider, this.workspaceId);
      this.compiler = new DocumentCompiler(this.llm);

      this.engine.registerWorkflow(
        new ExecutionWorkflow(
          this.locusProvider,
          this.workspaceId,
          this.toolHandler,
          this.compiler
        )
      );
    }
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
    const response = await this.engine.execute(this.state, input);

    this.updateHistory("user", input);
    this.updateHistory(
      "assistant",
      response.content,
      response.artifacts,
      response.suggestedActions
    );

    return response;
  }

  private updateHistory(
    role: "user" | "assistant",
    content: string,
    artifacts?: AIArtifact[],
    suggestedActions?: SuggestedAction[]
  ) {
    this.state.history.push({ role, content, artifacts, suggestedActions });
  }

  getState(): AgentState {
    return this.state;
  }

  async invoke(prompt: string): Promise<string> {
    const response = await this.llm.invoke(prompt);
    return response.content as string;
  }
}
