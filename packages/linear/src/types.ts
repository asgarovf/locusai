/**
 * Core TypeScript interfaces for @locusai/locus-linear.
 *
 * These types define the configuration shape (stored in .locus/config.json),
 * sync state (stored in .locus/linear/sync-state.json), and issue mappings
 * between Linear and GitHub.
 */

// ─── OAuth & Auth ────────────────────────────────────────────────────────────

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface LinearConfig {
  auth: TokenInfo | null;
  teamKey: string | null;
  projectId: string | null;
  syncInterval: string;
  userMapping: Record<string, string>;
  stateMapping: Record<string, string>;
  labelMapping: Record<string, string>;
  importFilter: ImportFilter;
}

export interface ImportFilter {
  states: string[];
  priorities: number[];
}

// ─── Issue Mapping ───────────────────────────────────────────────────────────

export interface IssueMapping {
  linearId: string;
  linearIdentifier: string;
  githubIssueNumber: number;
  lastLinearUpdate: string;
  lastGithubUpdate: string;
  lastSyncedAt: string;
}

// ─── Sync State ──────────────────────────────────────────────────────────────

export interface SyncState {
  lastSyncAt: string | null;
  lastImportAt: string | null;
  lastExportAt: string | null;
  mappings: IssueMapping[];
}

// ─── Linear Entities (simplified for internal use) ───────────────────────────

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  state: string;
  labels: string[];
  assigneeId: string | null;
  projectId: string | null;
  cycleId: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: string;
  position: number;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearCycle {
  id: string;
  number: number;
  name: string | null;
  startsAt: string;
  endsAt: string;
}

// ─── Command Types ───────────────────────────────────────────────────────────

export type LinearCommand =
  | "auth"
  | "import"
  | "export"
  | "create"
  | "issues"
  | "issue"
  | "team"
  | "mapping"
  | "sync"
  | "help";
