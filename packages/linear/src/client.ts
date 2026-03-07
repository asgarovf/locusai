/**
 * Linear API client wrapper with automatic token refresh.
 *
 * Wraps the `@linear/sdk` `LinearClient` and transparently refreshes
 * the OAuth access token when it is near expiry (within 5 minutes).
 */

import type {
  CycleConnection,
  Issue,
  IssueConnection,
  IssueLabelConnection,
  IssuePayload,
  Team,
  TeamConnection,
  WorkflowStateConnection,
} from "@linear/sdk";
import { LinearClient, type LinearDocument } from "@linear/sdk";
import { isTokenExpired, refreshAccessToken } from "./auth/token.js";
import { loadLinearConfig, validateLinearConfig } from "./config.js";
import type { TokenInfo } from "./types.js";

export interface LocusLinearClientOptions {
  clientId?: string;
  clientSecret?: string;
  cwd?: string;
}

/**
 * Creates and returns an authenticated Linear API client.
 *
 * Before each call, checks whether the token is near expiry
 * and refreshes it if needed. Use `getClient()` to get the
 * underlying `@linear/sdk` `LinearClient` for direct access.
 */
export class LocusLinearClient {
  private client: LinearClient;
  private tokens: TokenInfo;
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private cwd: string | undefined;

  constructor(tokens: TokenInfo, options?: LocusLinearClientOptions) {
    this.tokens = tokens;
    this.clientId = options?.clientId;
    this.clientSecret = options?.clientSecret;
    this.cwd = options?.cwd;
    this.client = new LinearClient({ accessToken: tokens.accessToken });
  }

  /**
   * Create a LocusLinearClient from stored config.
   * Throws if not authenticated or missing team config.
   */
  static fromConfig(options?: LocusLinearClientOptions): LocusLinearClient {
    const cwd = options?.cwd;
    const config = loadLinearConfig(cwd);
    const error = validateLinearConfig(config);
    if (error) {
      throw new Error(error);
    }
    // validateLinearConfig above ensures config.auth exists
    return new LocusLinearClient(config.auth as TokenInfo, { ...options, cwd });
  }

  /**
   * Ensure the token is fresh, refreshing if needed.
   * Returns the underlying LinearClient ready for use.
   */
  async ensureFreshClient(): Promise<LinearClient> {
    if (this.clientId && this.clientSecret && isTokenExpired(this.tokens)) {
      this.tokens = await refreshAccessToken(
        this.tokens,
        this.clientId,
        this.clientSecret,
        this.cwd
      );
      this.client = new LinearClient({
        accessToken: this.tokens.accessToken,
      });
    }
    return this.client;
  }

  /** Get the raw LinearClient (without auto-refresh). */
  getClient(): LinearClient {
    return this.client;
  }

  // ─── Typed API Methods ──────────────────────────────────────────────────────

  /** Fetch a single issue by ID. */
  async getIssue(id: string): Promise<Issue> {
    const client = await this.ensureFreshClient();
    return client.issue(id);
  }

  /** Fetch issues with optional filters. */
  async getIssues(
    variables?: Record<string, unknown>
  ): Promise<IssueConnection> {
    const client = await this.ensureFreshClient();
    return client.issues(variables);
  }

  /** Create a new issue. */
  async createIssue(
    input: LinearDocument.IssueCreateInput
  ): Promise<IssuePayload> {
    const client = await this.ensureFreshClient();
    return client.createIssue(input);
  }

  /** Update an existing issue. */
  async updateIssue(
    id: string,
    input: LinearDocument.IssueUpdateInput
  ): Promise<IssuePayload> {
    const client = await this.ensureFreshClient();
    return client.updateIssue(id, input);
  }

  /** Fetch a team by ID. */
  async getTeam(id: string): Promise<Team> {
    const client = await this.ensureFreshClient();
    return client.team(id);
  }

  /** Fetch all teams. */
  async getTeams(variables?: Record<string, unknown>): Promise<TeamConnection> {
    const client = await this.ensureFreshClient();
    return client.teams(variables);
  }

  /** Fetch workflow states. */
  async getWorkflowStates(
    variables?: Record<string, unknown>
  ): Promise<WorkflowStateConnection> {
    const client = await this.ensureFreshClient();
    return client.workflowStates(variables);
  }

  /** Fetch issue labels. */
  async getLabels(
    variables?: Record<string, unknown>
  ): Promise<IssueLabelConnection> {
    const client = await this.ensureFreshClient();
    return client.issueLabels(variables);
  }

  /** Fetch cycles. */
  async getCycles(
    variables?: Record<string, unknown>
  ): Promise<CycleConnection> {
    const client = await this.ensureFreshClient();
    return client.cycles(variables);
  }
}
