/**
 * OAuth 2.0 (3LO) authentication for Jira Cloud.
 *
 * Implements the full browser-based authorization code flow:
 *   1. Generate CSRF state parameter
 *   2. Open browser to Atlassian authorization URL
 *   3. Start ephemeral HTTP server to receive callback
 *   4. Exchange authorization code for tokens
 *   5. Fetch Cloud ID from accessible-resources endpoint
 *
 * Also provides token refresh with rotating refresh token support.
 */

import { randomBytes } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import axios from "axios";
import open from "open";
import type { JiraOAuthCredentials } from "../types.js";
import { prompt } from "./prompt.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JiraOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackPort: number;
  scopes: string[];
}

interface JiraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface JiraCloudResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTH_URL = "https://auth.atlassian.com/authorize";
const TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const RESOURCES_URL =
  "https://api.atlassian.com/oauth/token/accessible-resources";

const DEFAULT_PORT = 8089;
const DEFAULT_SCOPES = [
  "read:jira-work",
  "write:jira-work",
  "read:jira-user",
  "offline_access",
];

// ─── OAuth Flow ──────────────────────────────────────────────────────────────

/**
 * Interactively prompt the user for OAuth client credentials,
 * then run the full OAuth 2.0 (3LO) authorization code flow.
 */
export async function promptForOAuth(): Promise<JiraOAuthCredentials> {
  process.stderr.write("\n  Jira Cloud — OAuth 2.0 Authentication\n\n");
  process.stderr.write(
    "  You need an OAuth 2.0 (3LO) app registered at:\n" +
      "  https://developer.atlassian.com/console/myapps/\n\n" +
      "  Required callback URL: http://localhost:8089/callback\n\n"
  );

  const clientId = await prompt("  Client ID: ");
  if (!clientId) {
    throw new Error("Client ID is required.");
  }

  const clientSecret = await prompt("  Client secret: ", true);
  if (!clientSecret) {
    throw new Error("Client secret is required.");
  }

  const config: JiraOAuthConfig = {
    clientId,
    clientSecret,
    callbackPort: DEFAULT_PORT,
    scopes: DEFAULT_SCOPES,
  };

  return startOAuthFlow(config);
}

/**
 * Run the full OAuth 2.0 (3LO) authorization code flow:
 *   1. Generate CSRF state
 *   2. Open browser to authorization URL
 *   3. Start callback server
 *   4. Exchange code for tokens
 *   5. Discover Cloud ID
 */
export async function startOAuthFlow(
  config: JiraOAuthConfig
): Promise<JiraOAuthCredentials> {
  const state = randomBytes(16).toString("base64url");
  const redirectUri = `http://localhost:${config.callbackPort}/callback`;

  const authUrl = buildAuthorizationUrl(config, state, redirectUri);

  process.stderr.write("  Opening browser for authorization...\n");
  await open(authUrl);
  process.stderr.write(
    `  If the browser did not open, visit:\n  ${authUrl}\n\n`
  );

  const code = await waitForCallback(config.callbackPort, state);

  process.stderr.write("  Exchanging authorization code for tokens...\n");
  const tokens = await exchangeCodeForTokens(code, config, redirectUri);

  process.stderr.write("  Discovering Jira Cloud site...\n");
  const cloudId = await fetchCloudId(tokens.access_token);

  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  process.stderr.write("  OAuth authentication successful.\n\n");

  return {
    method: "oauth",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    cloudId,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  };
}

// ─── Authorization URL ───────────────────────────────────────────────────────

function buildAuthorizationUrl(
  config: JiraOAuthConfig,
  state: string,
  redirectUri: string
): string {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: config.clientId,
    scope: config.scopes.join(" "),
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
  });

  return `${AUTH_URL}?${params.toString()}`;
}

// ─── Callback Server ────────────────────────────────────────────────────────

/**
 * Start an ephemeral HTTP server on the given port and wait for the
 * OAuth callback with a valid authorization code.
 * Validates the state parameter to prevent CSRF attacks.
 */
function waitForCallback(port: number, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        const description = url.searchParams.get("error_description") ?? error;
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Authorization Failed</h2>" +
            `<p>${description}</p>` +
            "<p>You can close this window.</p></body></html>"
        );
        server.close();
        reject(new Error(`OAuth authorization denied: ${description}`));
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Missing Authorization Code</h2>" +
            "<p>You can close this window.</p></body></html>"
        );
        server.close();
        reject(new Error("No authorization code received in callback."));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Invalid State</h2>" +
            "<p>CSRF validation failed. Please try again.</p>" +
            "<p>You can close this window.</p></body></html>"
        );
        server.close();
        reject(
          new Error("OAuth state mismatch — possible CSRF attack. Try again.")
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><h2>Authorization Successful</h2>" +
          "<p>You can close this window and return to the terminal.</p></body></html>"
      );

      server.close();
      resolve(code);
    });

    server.on("error", (err: Error) => {
      reject(
        new Error(
          `Failed to start callback server on port ${port}: ${err.message}`
        )
      );
    });

    server.listen(port, "127.0.0.1", () => {
      process.stderr.write(
        `  Waiting for authorization callback on port ${port}...\n`
      );
    });
  });
}

// ─── Token Exchange ──────────────────────────────────────────────────────────

/**
 * Exchange an authorization code for access and refresh tokens.
 */
async function exchangeCodeForTokens(
  code: string,
  config: JiraOAuthConfig,
  redirectUri: string
): Promise<JiraTokenResponse> {
  const response = await axios.post(
    TOKEN_URL,
    {
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    },
    { timeout: 15_000 }
  );

  return response.data as JiraTokenResponse;
}

// ─── Cloud ID Discovery ─────────────────────────────────────────────────────

/**
 * Fetch the Cloud ID from Atlassian's accessible-resources endpoint.
 * If multiple sites are accessible, uses the first one.
 */
async function fetchCloudId(accessToken: string): Promise<string> {
  const response = await axios.get(RESOURCES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15_000,
  });

  const resources = response.data as JiraCloudResource[];

  if (!resources.length) {
    throw new Error(
      "No Jira Cloud sites found for this account. " +
        "Ensure your OAuth app has the correct scopes and your account has access to a Jira site."
    );
  }

  if (resources.length > 1) {
    process.stderr.write(
      `  Found ${resources.length} Jira sites. Using: ${resources[0].name} (${resources[0].url})\n`
    );
  }

  return resources[0].id;
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

/**
 * Refresh an OAuth access token using a refresh token.
 * Handles Atlassian's rotating refresh tokens — the new refresh token
 * invalidates the previous one.
 */
export async function refreshAccessToken(
  refreshToken: string,
  config: Pick<JiraOAuthConfig, "clientId" | "clientSecret">
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}> {
  const response = await axios.post(
    TOKEN_URL,
    {
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    },
    { timeout: 15_000 }
  );

  const data = response.data as JiraTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}
