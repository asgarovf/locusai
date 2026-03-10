/**
 * JiraClient — core HTTP layer for @locusai/locus-jira.
 *
 * Wraps axios with request/response interceptors for authentication
 * and error handling. Supports OAuth, API Token (Cloud), and PAT (Server/DC).
 */

import axios, { type AxiosInstance, type AxiosError } from "axios";
import {
  loadJiraConfig,
  saveCredentials,
  validateJiraConfig,
} from "../config.js";
import { handleJiraError, JiraTokenExpiredError } from "../errors.js";
import type { JiraCredentials, JiraOAuthCredentials } from "../types.js";
import type {
  JiraBoard,
  JiraIssue,
  JiraProject,
  JiraSearchResult,
  JiraSprint,
  JiraTransition,
  JiraUser,
} from "./types.js";

const DEFAULT_TIMEOUT = 30_000;
const PAGE_SIZE = 50;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// ─── Pagination ─────────────────────────────────────────────────────────────

interface PaginatedResponse<T> {
  values?: T[];
  issues?: T[];
  total: number;
  startAt: number;
  maxResults: number;
}

type PageFetcher<T> = (
  startAt: number,
  maxResults: number
) => Promise<PaginatedResponse<T>>;

/**
 * Generic offset-based pagination helper.
 * Fetches all pages until `total` is reached using `startAt` + `maxResults`.
 */
async function fetchAllPages<T>(fetcher: PageFetcher<T>): Promise<T[]> {
  const all: T[] = [];
  let startAt = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await fetcher(startAt, PAGE_SIZE);
    const items = page.values ?? page.issues ?? [];
    all.push(...items);

    startAt += items.length;
    hasMore = all.length < page.total && items.length > 0;
  }

  return all;
}

// ─── Token-based Pagination ─────────────────────────────────────────────────

interface TokenPaginatedResponse<T> {
  issues?: T[];
  nextPageToken?: string;
  isLast?: boolean;
}

type TokenPageFetcher<T> = (
  nextPageToken: string | undefined,
  maxResults: number
) => Promise<TokenPaginatedResponse<T>>;

/**
 * Generic token-based pagination helper for endpoints like /search/jql.
 * Fetches all pages until `nextPageToken` is absent or `isLast` is true.
 */
async function fetchAllPagesTokenBased<T>(
  fetcher: TokenPageFetcher<T>
): Promise<T[]> {
  const all: T[] = [];
  let nextPageToken: string | undefined;

  do {
    const page = await fetcher(nextPageToken, PAGE_SIZE);
    const items = page.issues ?? [];
    all.push(...items);

    if (!page.nextPageToken || page.isLast || items.length === 0) {
      break;
    }
    nextPageToken = page.nextPageToken;
  } while (true);

  return all;
}

// ─── Base URL Resolution ────────────────────────────────────────────────────

function resolveBaseUrl(credentials: JiraCredentials): string {
  switch (credentials.method) {
    case "oauth":
      return `https://api.atlassian.com/ex/jira/${credentials.cloudId}/rest/api/3`;
    case "api-token":
      return `${credentials.baseUrl}/rest/api/3`;
    case "pat":
      return `${credentials.baseUrl}/rest/api/2`;
  }
}

function resolveAgileBaseUrl(credentials: JiraCredentials): string {
  switch (credentials.method) {
    case "oauth":
      return `https://api.atlassian.com/ex/jira/${credentials.cloudId}/rest/agile/1.0`;
    case "api-token":
      return `${credentials.baseUrl}/rest/agile/1.0`;
    case "pat":
      return `${credentials.baseUrl}/rest/agile/1.0`;
  }
}

// ─── JiraClient ─────────────────────────────────────────────────────────────

export class JiraClient {
  private readonly api: AxiosInstance;
  private readonly agileApi: AxiosInstance;
  private credentials: JiraCredentials;

  constructor(credentials: JiraCredentials) {
    this.credentials = credentials;

    this.api = axios.create({
      baseURL: resolveBaseUrl(credentials),
      timeout: DEFAULT_TIMEOUT,
      headers: { Accept: "application/json" },
    });

    this.agileApi = axios.create({
      baseURL: resolveAgileBaseUrl(credentials),
      timeout: DEFAULT_TIMEOUT,
      headers: { Accept: "application/json" },
    });

    // Request interceptor — inject auth header
    const authInterceptor = async (config: Record<string, unknown>) => {
      await this.ensureFreshToken();
      (config as { headers: Record<string, string> }).headers = {
        ...((config as { headers?: Record<string, string> }).headers ?? {}),
        Authorization: this.getAuthHeader(),
      };
      return config;
    };

    this.api.interceptors.request.use(authInterceptor as never);
    this.agileApi.interceptors.request.use(authInterceptor as never);

    // Response interceptor — map errors to typed classes
    const errorInterceptor = (error: AxiosError) => {
      if (error.response) {
        handleJiraError(error);
      }
      return Promise.reject(error);
    };

    this.api.interceptors.response.use(undefined, errorInterceptor);
    this.agileApi.interceptors.response.use(undefined, errorInterceptor);
  }

  /**
   * Create a JiraClient from the stored config in `.locus/config.json`.
   * Throws if not authenticated.
   */
  static fromConfig(cwd?: string): JiraClient {
    const config = loadJiraConfig(cwd);
    const error = validateJiraConfig(config);
    if (error || !config.auth) {
      throw new Error(error ?? "Not authenticated. Run: locus jira auth");
    }
    return new JiraClient(config.auth);
  }

  // ─── Auth Header ────────────────────────────────────────────────────────

  private getAuthHeader(): string {
    switch (this.credentials.method) {
      case "oauth":
        return `Bearer ${this.credentials.accessToken}`;
      case "api-token": {
        const encoded = Buffer.from(
          `${this.credentials.email}:${this.credentials.apiToken}`
        ).toString("base64");
        return `Basic ${encoded}`;
      }
      case "pat":
        return `Bearer ${this.credentials.patToken}`;
    }
  }

  // ─── Token Freshness ──────────────────────────────────────────────────

  /**
   * For OAuth credentials, check if the access token expires within
   * 5 minutes and auto-refresh if needed. No-op for API Token and PAT.
   */
  async ensureFreshToken(): Promise<void> {
    if (this.credentials.method !== "oauth") return;

    const oauth = this.credentials as JiraOAuthCredentials;
    const expiresAt = new Date(oauth.expiresAt).getTime();
    const now = Date.now();

    if (expiresAt - now > TOKEN_REFRESH_BUFFER_MS) return;

    try {
      const response = await axios.post(
        "https://auth.atlassian.com/oauth/token",
        {
          grant_type: "refresh_token",
          client_id: oauth.clientId,
          client_secret: oauth.clientSecret,
          refresh_token: oauth.refreshToken,
        },
        { timeout: 15_000 }
      );

      const data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const updated: JiraOAuthCredentials = {
        ...oauth,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? oauth.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      };

      this.credentials = updated;

      // Update base URLs with fresh credentials
      this.api.defaults.baseURL = resolveBaseUrl(updated);
      this.agileApi.defaults.baseURL = resolveAgileBaseUrl(updated);

      // Persist updated tokens
      saveCredentials(updated);
    } catch {
      throw new JiraTokenExpiredError();
    }
  }

  // ─── Core API Methods ─────────────────────────────────────────────────

  /**
   * GET /rest/api/3/issue/{key}?expand=renderedFields
   */
  async getIssue(key: string): Promise<JiraIssue> {
    const response = await this.api.get(`/issue/${encodeURIComponent(key)}`, {
      params: { expand: "renderedFields" },
    });
    return response.data as JiraIssue;
  }

  /**
   * Search issues via JQL.
   * Cloud (OAuth / API Token): GET /rest/api/3/search/jql with token-based pagination.
   * Server/DC (PAT):           GET /rest/api/2/search with offset-based pagination.
   * When fetchAll is true, paginates through all results.
   */
  async searchIssues(
    jql: string,
    opts?: { startAt?: number; maxResults?: number; fetchAll?: boolean }
  ): Promise<JiraSearchResult> {
    const isCloud = this.credentials.method !== "pat";

    if (opts?.fetchAll) {
      if (isCloud) {
        const issues = await fetchAllPagesTokenBased<JiraIssue>(
          (nextPageToken, maxResults) =>
            this.api
              .get("/search/jql", {
                params: { jql, maxResults, nextPageToken },
              })
              .then((r) => r.data as TokenPaginatedResponse<JiraIssue>)
        );
        return { issues };
      }

      const issues = await fetchAllPages<JiraIssue>((startAt, maxResults) =>
        this.api
          .get("/search", { params: { jql, startAt, maxResults } })
          .then((r) => r.data as PaginatedResponse<JiraIssue>)
      );
      return { issues, total: issues.length, startAt: 0, maxResults: issues.length };
    }

    if (isCloud) {
      const response = await this.api.get("/search/jql", {
        params: {
          jql,
          maxResults: opts?.maxResults ?? PAGE_SIZE,
        },
      });
      return response.data as JiraSearchResult;
    }

    const response = await this.api.get("/search", {
      params: {
        jql,
        startAt: opts?.startAt ?? 0,
        maxResults: opts?.maxResults ?? PAGE_SIZE,
      },
    });
    return response.data as JiraSearchResult;
  }

  /**
   * GET /rest/api/3/issue/{key}/transitions
   */
  async getTransitions(key: string): Promise<JiraTransition[]> {
    const response = await this.api.get(
      `/issue/${encodeURIComponent(key)}/transitions`
    );
    return (response.data as { transitions: JiraTransition[] }).transitions;
  }

  /**
   * POST /rest/api/3/issue/{key}/transitions
   */
  async transitionIssue(key: string, transitionId: string): Promise<void> {
    await this.api.post(`/issue/${encodeURIComponent(key)}/transitions`, {
      transition: { id: transitionId },
    });
  }

  /**
   * POST /rest/api/3/issue/{key}/comment
   */
  async addComment(key: string, body: string): Promise<void> {
    const isCloud = this.credentials.method !== "pat";

    // Cloud API v3 expects ADF; Server API v2 accepts plain text
    const commentBody = isCloud
      ? {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: body }],
            },
          ],
        }
      : body;

    await this.api.post(`/issue/${encodeURIComponent(key)}/comment`, {
      body: commentBody,
    });
  }

  /**
   * GET /rest/api/3/project/search
   */
  async getProjects(): Promise<JiraProject[]> {
    return fetchAllPages<JiraProject>((startAt, maxResults) =>
      this.api
        .get("/project/search", { params: { startAt, maxResults } })
        .then((r) => r.data as PaginatedResponse<JiraProject>)
    );
  }

  /**
   * GET /rest/api/3/myself
   */
  async getMyself(): Promise<JiraUser> {
    const response = await this.api.get("/myself");
    return response.data as JiraUser;
  }

  /**
   * POST /rest/api/3/issue/{key}/remotelink
   */
  async addRemoteLink(
    key: string,
    title: string,
    url: string
  ): Promise<void> {
    await this.api.post(`/issue/${encodeURIComponent(key)}/remotelink`, {
      object: {
        url,
        title,
      },
    });
  }

  // ─── Agile API Methods ────────────────────────────────────────────────

  /**
   * GET /rest/agile/1.0/board
   */
  async getBoards(): Promise<JiraBoard[]> {
    return fetchAllPages<JiraBoard>((startAt, maxResults) =>
      this.agileApi
        .get("/board", { params: { startAt, maxResults } })
        .then((r) => r.data as PaginatedResponse<JiraBoard>)
    );
  }

  /**
   * GET /rest/agile/1.0/board/{boardId}/sprint?state=active
   */
  async getCurrentSprint(boardId: number): Promise<JiraSprint | null> {
    const response = await this.agileApi.get(`/board/${boardId}/sprint`, {
      params: { state: "active" },
    });
    const data = response.data as { values: JiraSprint[] };
    return data.values[0] ?? null;
  }

  /**
   * GET /rest/agile/1.0/sprint/{sprintId}/issue
   */
  async getSprintIssues(
    _boardId: number,
    sprintId: number
  ): Promise<JiraIssue[]> {
    return fetchAllPages<JiraIssue>((startAt, maxResults) =>
      this.agileApi
        .get(`/sprint/${sprintId}/issue`, { params: { startAt, maxResults } })
        .then((r) => r.data as PaginatedResponse<JiraIssue>)
    );
  }
}
