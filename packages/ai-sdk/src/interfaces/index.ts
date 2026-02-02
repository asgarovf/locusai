import { AIArtifact, SuggestedAction } from "@locusai/shared";

export * from "./context";

export type ProjectPhase = "PLANNING" | "MVP_BUILD" | "SCALING" | "MAINTENANCE";

export interface RepositoryContext {
  summary: string;
  fileStructure: string;
  dependencies: Record<string, string>;
  frameworks: string[];
  configFiles: string[];
  lastAnalysis: string; // ISO Date string
}

export interface ProjectManifest {
  name: string;
  mission: string;
  targetUsers: string[];
  techStack: string[];
  phase: ProjectPhase;
  features: string[];
  competitors: string[];
  brandVoice?: string;
  successMetrics?: string[];
  completenessScore: number; // 0-100
  repositoryState?: RepositoryContext;
}

export enum AgentMode {
  INTERVIEW = "INTERVIEW",
  PLANNING = "PLANNING",
  IDLE = "IDLE",
  QUERY = "QUERY",
  IDEA = "IDEA",
  DOCUMENTING = "DOCUMENTING",
}

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  artifacts?: AIArtifact[];
  suggestedActions?: SuggestedAction[];
}

export interface WorkflowEntity {
  id: string;
  type: "document";
  title: string;
  createdAt: string;
}

export interface WorkflowState {
  currentIntent: string;
  createdEntities: WorkflowEntity[];
  pendingActions: string[];
  manifestSummary: string; // Condensed context
}

export interface PendingExecution {
  intent: string;
  originalInput: string;
  executionId: string;
}

export interface AgentState {
  mode: AgentMode;
  scratchpad: string[]; // Temporary reasoning buffer
  missingInfo: string[]; // e.g. ["tech_stack", "timelines"]
  history: AgentChatMessage[];
  manifest?: Partial<ProjectManifest>;
  workflow?: WorkflowState;
  pendingExecution?: PendingExecution;
}

export interface AgentResponse {
  content: string;
  artifacts?: AIArtifact[];
  suggestedActions?: SuggestedAction[];
}
