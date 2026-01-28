import { AIArtifact, SuggestedAction } from "@locusai/shared";

export * from "./context";

export type ProjectPhase = "PLANNING" | "MVP_BUILD" | "SCALING" | "MAINTENANCE";

export interface ProjectSprint {
  id: string;
  goal: string;
  tasks: string[]; // Task IDs
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
}

export interface ProjectMilestone {
  title: string;
  date?: string;
  status: "PENDING" | "COMPLETED";
}

export interface ProjectTimeline {
  sprints: ProjectSprint[];
  milestones: ProjectMilestone[];
}

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

  // New Architecture Fields
  timeline?: ProjectTimeline;
  repositoryState?: RepositoryContext;
}

export enum AgentMode {
  INTERVIEW = "INTERVIEW",
  PLANNING = "PLANNING",
  EXECUTING = "EXECUTING",
  IDLE = "IDLE",
  ANALYZING = "ANALYZING",
  QUERY = "QUERY",
  IDEA = "IDEA",
  COMPILING = "COMPILING",
  DOCUMENTING = "DOCUMENTING",
}

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
  artifacts?: AIArtifact[];
  suggestedActions?: SuggestedAction[];
}

export interface WorkflowEntity {
  id: string;
  type: "document" | "task" | "sprint";
  title: string;
  createdAt: string;
}

export interface WorkflowState {
  currentIntent: string;
  createdEntities: WorkflowEntity[];
  pendingActions: string[];
  manifestSummary: string; // Condensed context
}

export interface AgentState {
  mode: AgentMode;
  scratchpad: string[]; // Temporary reasoning buffer
  missingInfo: string[]; // e.g. ["tech_stack", "timelines"]
  history: AgentChatMessage[];
  manifest?: Partial<ProjectManifest>;
  workflow?: WorkflowState;
}

export interface AgentResponse {
  content: string;
  artifacts?: AIArtifact[];
  suggestedActions?: SuggestedAction[];
}

export interface ToolExecutionResult {
  observations: string[];
  artifacts: AIArtifact[];
  suggestedActions: SuggestedAction[];
}
