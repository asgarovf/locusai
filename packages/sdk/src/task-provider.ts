/**
 * Shared TaskProvider interface for task management integrations.
 *
 * All providers (GitHub, Jira, Linear) implement this contract to provide
 * a uniform API for authentication, issue management, status updates,
 * comments, and sprint/milestone/cycle tracking.
 */

// ─── Issue Types ────────────────────────────────────────────────────────────

/** Normalized comment from any provider. */
export interface ProviderComment {
  author: string;
  body: string;
  createdAt: string;
}

/** Normalized issue from any provider. */
export interface ProviderIssue {
  /** Provider-specific ID (GitHub number as string, Jira KEY-123, Linear identifier). */
  id: string;
  title: string;
  /** Markdown description / body. */
  body: string;
  /** Provider-specific status string (e.g., "open", "In Progress", workflow state). */
  status: string;
  priority: "critical" | "high" | "medium" | "low" | "none";
  labels: string[];
  assignee?: string;
  /** Web URL to the issue. */
  url: string;
  comments: ProviderComment[];
}

/** Filters for listing issues. All fields are optional. */
export interface IssueFilters {
  /** Filter by status / state. */
  status?: string;
  /** Filter by label name. */
  label?: string;
  /** Filter by assignee username. */
  assignee?: string;
  /** Filter by sprint / milestone / cycle ID. */
  sprintId?: string;
  /** Maximum number of issues to return. */
  limit?: number;
}

// ─── Sprint Types ───────────────────────────────────────────────────────────

/** Normalized sprint / milestone / cycle from any provider. */
export interface ProviderSprint {
  id: string;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
  issueCount: number;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

/** Result of an authentication check. */
export interface AuthResult {
  authenticated: boolean;
  user?: string;
}

// ─── TaskProvider Interface ─────────────────────────────────────────────────

/**
 * Unified contract that all task management providers must implement.
 *
 * Covers:
 * - Authentication verification
 * - Issue fetching (single + list with filters)
 * - Status lifecycle (in-progress → done / failed)
 * - Comment posting
 * - Sprint / milestone / cycle management
 */
export interface TaskProvider {
  /** Provider identifier, e.g. "github", "jira", "linear". */
  readonly name: string;

  // ── Authentication ──────────────────────────────────────────────────────

  /** Verify that the provider is authenticated and return the current user. */
  checkAuth(): Promise<AuthResult>;

  // ── Issues ──────────────────────────────────────────────────────────────

  /** Fetch a single issue by its provider-specific ID. */
  getIssue(id: string): Promise<ProviderIssue>;

  /** List issues, optionally filtered. */
  listIssues(filters?: IssueFilters): Promise<ProviderIssue[]>;

  // ── Status Management ───────────────────────────────────────────────────

  /** Mark an issue as in-progress (e.g., add label, transition status). */
  markInProgress(id: string): Promise<void>;

  /** Mark an issue as done, optionally linking a PR URL. */
  markDone(id: string, prUrl?: string): Promise<void>;

  /** Mark an issue as failed with an error description. */
  markFailed(id: string, error: string): Promise<void>;

  // ── Comments ────────────────────────────────────────────────────────────

  /** Post a comment on an issue. */
  postComment(id: string, body: string): Promise<void>;

  // ── Sprints / Milestones / Cycles ───────────────────────────────────────

  /** Get the currently active sprint / milestone / cycle, or null if none. */
  getActiveSprint(): Promise<ProviderSprint | null>;

  /** List issues belonging to a specific sprint / milestone / cycle. */
  getSprintIssues(sprintId: string): Promise<ProviderIssue[]>;
}
