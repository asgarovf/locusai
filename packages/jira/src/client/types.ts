/**
 * Jira REST API response types for @locusai/locus-jira.
 *
 * These interfaces model the Jira Cloud REST API v3 responses
 * used by the client module.
 */

// ─── Atlassian Document Format ──────────────────────────────────────────────

export interface ADFMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  marks?: ADFMark[];
  attrs?: Record<string, unknown>;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export interface JiraUser {
  accountId: string;
  /** Username — present on Server/DC (PAT auth), absent on Cloud. */
  name?: string;
  displayName: string;
  emailAddress?: string;
  active?: boolean;
  accountType?: string;
}

// ─── Comments ───────────────────────────────────────────────────────────────

export interface JiraComment {
  id: string;
  body: ADFNode | string;
  /** May be null for system-generated or anonymous comments. */
  author: JiraUser | null;
  created: string;
  updated?: string;
}

// ─── Issues ─────────────────────────────────────────────────────────────────

export interface JiraIssueFields {
  summary: string;
  description: ADFNode | string | null;
  status: { id: string; name: string };
  priority: { id: string; name: string } | null;
  labels: string[];
  assignee: JiraUser | null;
  reporter: JiraUser | null;
  issuetype: { id: string; name: string };
  project: { id: string; key: string; name: string };
  created: string;
  updated: string;
  sprint?: JiraSprint | null;
  parent?: { id: string; key: string } | null;
  comment?: {
    comments: JiraComment[];
    total: number;
    startAt?: number;
    maxResults?: number;
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  /** May be absent if the search endpoint omits fields or the issue is restricted. */
  fields: JiraIssueFields;
  renderedFields?: Record<string, unknown>;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface JiraSearchResult {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
  total?: number;
  startAt?: number;
  maxResults?: number;
}

// ─── Transitions ────────────────────────────────────────────────────────────

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory?: {
      id: number;
      key: string;
      name: string;
      colorName?: string;
    };
  };
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isConditional?: boolean;
  isLooped?: boolean;
}

// ─── Sprints ────────────────────────────────────────────────────────────────

export interface JiraSprint {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  createdDate?: string;
  originBoardId?: number;
  goal?: string;
  self?: string;
}

// ─── Boards ─────────────────────────────────────────────────────────────────

export interface JiraBoard {
  id: number;
  name: string;
  type: "scrum" | "kanban" | "agility";
  self?: string;
  location?: { projectId: number; projectKey: string; projectName: string };
}

// ─── Projects ───────────────────────────────────────────────────────────────

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  style?: string;
  projectTypeKey?: string;
  simplified?: boolean;
  self?: string;
}
