/**
 * Core TypeScript interfaces for @locusai/locus-jira.
 *
 * These types define the credential shapes (OAuth, API token, PAT),
 * and the configuration stored in `.locus/config.json` under `packages.jira`.
 */

// ─── Auth ───────────────────────────────────────────────────────────────────

export type JiraAuthMethod = "oauth" | "api-token" | "pat";

export interface JiraOAuthCredentials {
  method: "oauth";
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  cloudId: string;
  clientId: string;
  clientSecret: string;
}

export interface JiraApiTokenCredentials {
  method: "api-token";
  email: string;
  apiToken: string;
  baseUrl: string;
}

export interface JiraPatCredentials {
  method: "pat";
  patToken: string;
  baseUrl: string;
}

export type JiraCredentials =
  | JiraOAuthCredentials
  | JiraApiTokenCredentials
  | JiraPatCredentials;

// ─── Configuration ──────────────────────────────────────────────────────────

export interface JiraConfig {
  auth: JiraCredentials | null;
  projectKey: string | null;
  boardId: number | null;
  defaultJql: string | null;
  syncBack: boolean;
  transitionOnPR: boolean;
  userMapping: Record<string, string>;
  includeComments: boolean;
  maxIssuesPerRun: number;
}
