/**
 * Config module for @locusai/locus-jira.
 *
 * Loads the `packages.jira` section from `.locus/config.json`,
 * validates required fields, and provides typed accessors.
 * Also supports saving config updates and env-var overrides.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLocusConfig } from "@locusai/sdk";
import type { JiraConfig, JiraCredentials } from "./types.js";

const DEFAULT_JIRA_CONFIG: JiraConfig = {
  auth: null,
  projectKey: null,
  boardId: null,
  defaultJql: null,
  syncBack: false,
  transitionOnPR: false,
  userMapping: {},
  includeComments: true,
  maxIssuesPerRun: 20,
};

/**
 * Apply environment variable overrides to credentials.
 * Supports OAuth (JIRA_OAUTH_*), API Token (JIRA_EMAIL + JIRA_API_TOKEN),
 * and PAT (JIRA_PAT) overrides. OAuth takes highest precedence.
 */
function applyEnvOverrides(config: JiraConfig): JiraConfig {
  // OAuth env vars (highest precedence — for CI/CD with pre-obtained tokens)
  const oauthAccessToken = process.env.JIRA_OAUTH_ACCESS_TOKEN;
  const oauthRefreshToken = process.env.JIRA_OAUTH_REFRESH_TOKEN;
  const oauthClientId = process.env.JIRA_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.JIRA_OAUTH_CLIENT_SECRET;
  const cloudId = process.env.JIRA_CLOUD_ID;

  if (oauthAccessToken && oauthClientId && oauthClientSecret && cloudId) {
    return {
      ...config,
      auth: {
        method: "oauth",
        accessToken: oauthAccessToken,
        refreshToken: oauthRefreshToken ?? "",
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        cloudId,
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
      },
    };
  }

  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const pat = process.env.JIRA_PAT;

  if (pat && baseUrl) {
    return {
      ...config,
      auth: {
        method: "pat",
        patToken: pat,
        baseUrl,
      },
    };
  }

  if (email && apiToken && baseUrl) {
    return {
      ...config,
      auth: {
        method: "api-token",
        email,
        apiToken,
        baseUrl,
      },
    };
  }

  return config;
}

/**
 * Load the Jira config section from `.locus/config.json`.
 * Returns defaults for any missing fields.
 * Environment variables override stored credentials.
 */
export function loadJiraConfig(cwd?: string): JiraConfig {
  const locusConfig = readLocusConfig(cwd);
  const pkg = locusConfig.packages?.jira as Partial<JiraConfig> | undefined;

  const config: JiraConfig = {
    auth: (pkg?.auth as JiraCredentials) ?? DEFAULT_JIRA_CONFIG.auth,
    projectKey: pkg?.projectKey ?? DEFAULT_JIRA_CONFIG.projectKey,
    boardId: pkg?.boardId ?? DEFAULT_JIRA_CONFIG.boardId,
    defaultJql: pkg?.defaultJql ?? DEFAULT_JIRA_CONFIG.defaultJql,
    syncBack: pkg?.syncBack ?? DEFAULT_JIRA_CONFIG.syncBack,
    transitionOnPR: pkg?.transitionOnPR ?? DEFAULT_JIRA_CONFIG.transitionOnPR,
    userMapping: pkg?.userMapping ?? DEFAULT_JIRA_CONFIG.userMapping,
    includeComments:
      pkg?.includeComments ?? DEFAULT_JIRA_CONFIG.includeComments,
    maxIssuesPerRun:
      pkg?.maxIssuesPerRun ?? DEFAULT_JIRA_CONFIG.maxIssuesPerRun,
  };

  return applyEnvOverrides(config);
}

/**
 * Validate that the Jira config has required fields for API operations.
 * Returns an error message if invalid, or null if valid.
 */
export function validateJiraConfig(config: JiraConfig): string | null {
  if (!config.auth) {
    return "Not authenticated. Run: locus jira auth";
  }
  return null;
}

// ─── Raw Project Config I/O ─────────────────────────────────────────────────

function readProjectConfig(cwd?: string): Record<string, unknown> {
  const configPath = join(cwd ?? process.cwd(), ".locus", "config.json");
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

function writeProjectConfig(
  config: Record<string, unknown>,
  cwd?: string
): void {
  const configPath = join(cwd ?? process.cwd(), ".locus", "config.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function getJiraSection(
  config: Record<string, unknown>
): Record<string, unknown> {
  if (!config.packages || typeof config.packages !== "object") {
    config.packages = {};
  }
  const packages = config.packages as Record<string, unknown>;
  if (!packages.jira || typeof packages.jira !== "object") {
    packages.jira = {};
  }
  return packages.jira as Record<string, unknown>;
}

// ─── Config Mutation ────────────────────────────────────────────────────────

/**
 * Merge partial config into the stored Jira config section
 * in `.locus/config.json`.
 */
export function saveJiraConfig(
  update: Partial<JiraConfig>,
  cwd?: string
): void {
  const config = readProjectConfig(cwd);
  const jira = getJiraSection(config);

  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) {
      jira[key] = value;
    }
  }

  writeProjectConfig(config, cwd);
}

/**
 * Update only the auth credentials in the Jira config section.
 */
export function saveCredentials(
  credentials: JiraCredentials,
  cwd?: string
): void {
  const config = readProjectConfig(cwd);
  const jira = getJiraSection(config);
  jira.auth = credentials;
  writeProjectConfig(config, cwd);
}

/**
 * Clear auth credentials from the Jira config section.
 */
export function clearCredentials(cwd?: string): void {
  const config = readProjectConfig(cwd);
  const jira = getJiraSection(config);
  jira.auth = null;
  writeProjectConfig(config, cwd);
}

/**
 * Read the stored auth credentials from the Jira config section.
 */
export function loadCredentials(cwd?: string): JiraCredentials | null {
  const config = loadJiraConfig(cwd);
  return config.auth;
}
