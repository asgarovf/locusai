// ─── Configuration ───────────────────────────────────────────────────────────

export interface LocusConfig {
  version: string;
  github: {
    owner: string;
    repo: string;
    defaultBranch: string;
  };
  ai: {
    provider: AIProvider;
    model: string;
  };
  agent: AgentConfig;
  sprint: SprintConfig;
  logging: LoggingConfig;
  sandbox: SandboxConfig;
}

export type AIProvider = "claude" | "codex";

export interface AgentConfig {
  maxParallel: number;
  autoLabel: boolean;
  autoPR: boolean;
  baseBranch: string;
  rebaseBeforeTask: boolean;
}

export interface SprintConfig {
  active: string | null;
  stopOnFailure: boolean;
}

export interface LoggingConfig {
  level: LogLevel;
  maxFiles: number;
  maxTotalSizeMB: number;
}

export type LogLevel = "silent" | "normal" | "verbose" | "debug";

export interface ProviderSandboxes {
  claude?: string;
  codex?: string;
}

export interface SandboxConfig {
  enabled: boolean;
  /** User-managed persistent sandbox names per provider (set by `locus sandbox`). */
  providers: ProviderSandboxes;
  extraWorkspaces: string[];
  readOnlyPaths: string[];
}

// ─── GitHub Data ─────────────────────────────────────────────────────────────

export interface Issue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  milestone: string | null;
  assignees: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  number: number;
  title: string;
  description: string;
  state: "open" | "closed";
  dueOn: string | null;
  openIssues: number;
  closedIssues: number;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed" | "merged";
  head: string;
  base: string;
  labels: string[];
  url: string;
  createdAt: string;
}

export interface PRComment {
  id: number;
  body: string;
  user: string;
  createdAt: string;
  path?: string;
  line?: number;
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export interface LabelDef {
  name: string;
  color: string;
  description: string;
}

export const PRIORITY_LABELS: LabelDef[] = [
  { name: "p:critical", color: "B60205", description: "Critical priority" },
  { name: "p:high", color: "D93F0B", description: "High priority" },
  { name: "p:medium", color: "E99695", description: "Medium priority" },
  { name: "p:low", color: "F9D0C4", description: "Low priority" },
];

export const TYPE_LABELS: LabelDef[] = [
  { name: "type:feature", color: "0075CA", description: "New feature" },
  { name: "type:bug", color: "1D76DB", description: "Bug fix" },
  { name: "type:chore", color: "5319E7", description: "Maintenance/chore" },
  { name: "type:refactor", color: "6E5494", description: "Code refactoring" },
  { name: "type:docs", color: "0E8A16", description: "Documentation" },
];

export const STATUS_LABELS: LabelDef[] = [
  {
    name: "locus:queued",
    color: "C2E0C6",
    description: "Queued for execution",
  },
  {
    name: "locus:in-progress",
    color: "0E8A16",
    description: "Currently being executed",
  },
  {
    name: "locus:in-review",
    color: "FBCA04",
    description: "PR created, awaiting review",
  },
  {
    name: "locus:done",
    color: "006B75",
    description: "Completed successfully",
  },
  { name: "locus:failed", color: "B60205", description: "Execution failed" },
];

export const AGENT_LABEL: LabelDef = {
  name: "agent:managed",
  color: "7057FF",
  description: "Managed by Locus AI agent",
};

export const ALL_LABELS: LabelDef[] = [
  ...PRIORITY_LABELS,
  ...TYPE_LABELS,
  ...STATUS_LABELS,
  AGENT_LABEL,
];

// ─── Run State ───────────────────────────────────────────────────────────────

export interface RunState {
  runId: string;
  type: "sprint" | "parallel";
  sprint?: string;
  branch?: string;
  startedAt: string;
  tasks: RunTask[];
}

export interface RunTask {
  issue: number;
  order: number;
  status: "pending" | "in_progress" | "done" | "failed";
  pr?: number;
  completedAt?: string;
  failedAt?: string;
  error?: string;
}

// ─── AI Runner ───────────────────────────────────────────────────────────────

export interface AgentRunner {
  name: string;
  isAvailable(): Promise<boolean>;
  getVersion(): Promise<string>;
  execute(options: RunnerOptions): Promise<RunnerResult>;
  abort(): void;
}

export interface RunnerOptions {
  prompt: string;
  model?: string;
  cwd: string;
  onOutput?: (chunk: string) => void;
  /** Called with a short description when the AI invokes a tool (verbose mode only). */
  onToolActivity?: (summary: string) => void;
  /** Called when the runner's status changes (e.g., "Syncing sandbox...", "Thinking..."). */
  onStatusChange?: (message: string) => void;
  signal?: AbortSignal;
  verbose?: boolean;
  /** Activity label (e.g., "issue #42") — used for sandbox naming in parallel runs. */
  activity?: string;
}

export interface RunnerResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

// ─── Agent Execution ─────────────────────────────────────────────────────────

export interface AgentOptions {
  issueNumber: number;
  worktreePath?: string;
  provider: AIProvider;
  model: string;
  dryRun?: boolean;
  feedbackContext?: string;
  sprintContext?: string;
  /** Skip per-task PR creation (used for sprint runs where a single sprint PR is created instead). */
  skipPR?: boolean;
  /** Run the AI agent inside a Docker sandbox for isolation. */
  sandboxed?: boolean;
  /** Name of a user-managed sandbox to exec into (from `locus sandbox`). */
  sandboxName?: string;
}

export interface AgentResult {
  issueNumber: number;
  success: boolean;
  prNumber?: number;
  error?: string;
  summary?: string;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  created: string;
  updated: string;
  metadata: SessionMetadata;
  messages: SessionMessage[];
}

export interface SessionMetadata {
  cwd: string;
  branch: string;
  provider: AIProvider;
  model: string;
  totalTokens: number;
  totalTools: number;
}

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tools?: ToolUse[];
}

export interface ToolUse {
  tool: string;
  params: Record<string, unknown>;
  duration: number;
  result?: string;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

export interface RateLimitState {
  limit: number;
  remaining: number;
  reset: string; // ISO date string
  used: number;
  lastUpdated: string;
}

// ─── Conflict Detection ──────────────────────────────────────────────────────

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingFiles: string[];
  baseAdvanced: boolean;
  newCommits: number;
}

// ─── NDJSON Events (VSCode Extension Protocol) ──────────────────────────────

export type NDJSONEvent =
  | { type: "start"; sessionId: string; timestamp: string }
  | { type: "status"; state: "thinking" | "working"; elapsed: number }
  | { type: "text_delta"; content: string }
  | { type: "thinking"; content: string }
  | { type: "tool_started"; tool: string; params: Record<string, unknown> }
  | {
      type: "tool_completed";
      tool: string;
      duration: number;
      summary: string;
      diff?: string;
    }
  | {
      type: "done";
      sessionId: string;
      stats: { duration: number; tools: number; tokens: number };
    }
  | { type: "error"; message: string; retryable: boolean };

// ─── Logger ──────────────────────────────────────────────────────────────────

export interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

