/**
 * OAuth2 Authorization Code flow with PKCE for Linear.
 *
 * - Generates PKCE code_verifier + code_challenge (S256)
 * - Starts ephemeral HTTP server on port 8089
 * - Opens browser to Linear's authorization URL
 * - Handles callback: validates state, exchanges code for tokens
 * - Stores tokens via token.ts
 */

import { createHash, randomBytes } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import open from "open";
import type { TokenInfo } from "../types.js";
import { saveTokens } from "./token.js";

const LINEAR_AUTHORIZE_URL = "https://linear.app/oauth/authorize";
const LINEAR_TOKEN_URL = "https://api.linear.app/oauth/token";

const SCOPES = "read,write,issues:create,comments:create";
const PREFERRED_PORT: number = 8089;

/** Generate a cryptographically random code verifier (43-128 chars, URL-safe). */
function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** Derive the S256 code challenge from a code verifier. */
function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Generate a random state parameter for CSRF protection. */
function generateState(): string {
  return randomBytes(16).toString("hex");
}

export interface OAuthFlowOptions {
  clientId: string;
  cwd?: string;
}

export interface OAuthFlowResult {
  tokens: TokenInfo;
  cancelled: boolean;
}

/**
 * Run the full OAuth2 + PKCE flow:
 * 1. Start local callback server
 * 2. Open browser to Linear auth page
 * 3. Wait for callback with auth code
 * 4. Exchange code for tokens
 * 5. Store tokens
 */
export async function runOAuthFlow(
  options: OAuthFlowOptions
): Promise<OAuthFlowResult> {
  const { clientId, cwd } = options;

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  return new Promise<OAuthFlowResult>((resolve, reject) => {
    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        const actualPort = (server.address() as { port: number }).port;
        const redirectUri = `http://localhost:${actualPort}/callback`;

        try {
          const url = new URL(req.url ?? "/", `http://localhost`);

          if (url.pathname !== "/callback") {
            res.writeHead(404);
            res.end("Not found");
            return;
          }

          const receivedState = url.searchParams.get("state");
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          if (error) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              buildHtmlPage(
                "Authorization Cancelled",
                "You can close this window and return to the terminal."
              )
            );
            server.close();
            resolve({ tokens: null as unknown as TokenInfo, cancelled: true });
            return;
          }

          if (receivedState !== state) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(
              buildHtmlPage(
                "Error",
                "Invalid state parameter. This may be a CSRF attack. Please try again."
              )
            );
            server.close();
            reject(new Error("Invalid state parameter in OAuth callback"));
            return;
          }

          if (!code) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(
              buildHtmlPage(
                "Error",
                "No authorization code received. Please try again."
              )
            );
            server.close();
            reject(new Error("No authorization code in OAuth callback"));
            return;
          }

          const tokens = await exchangeCodeForTokens({
            code,
            codeVerifier,
            clientId,
            redirectUri,
          });

          saveTokens(tokens, cwd);

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            buildHtmlPage(
              "Authorization Successful",
              "You can close this window and return to the terminal."
            )
          );
          server.close();
          resolve({ tokens, cancelled: false });
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(
            buildHtmlPage("Error", "Token exchange failed. Please try again.")
          );
          server.close();
          reject(err);
        }
      }
    );

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${PREFERRED_PORT} is already in use. Please free it and try again.\n` +
              `  To find the process: lsof -i:${PREFERRED_PORT}\n` +
              `  To kill it:          kill -9 <PID>`
          )
        );
      } else {
        reject(
          new Error(`Failed to start OAuth callback server: ${err.message}`)
        );
      }
    });

    server.on("listening", () => {
      const actualPort = (server.address() as { port: number }).port;
      const redirectUri = `http://localhost:${actualPort}/callback`;

      const authUrl = new URL(LINEAR_AUTHORIZE_URL);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("prompt", "consent");

      process.stderr.write(`\n  Opening browser for Linear authorization...\n`);
      process.stderr.write(
        `  If the browser doesn't open, visit:\n  ${authUrl.toString()}\n\n`
      );

      open(authUrl.toString()).catch(() => {
        // Browser open failed — user can manually visit the URL
      });
    });

    server.listen(PREFERRED_PORT, "127.0.0.1");

    // Timeout after 5 minutes
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error("OAuth flow timed out after 5 minutes"));
      },
      5 * 60 * 1000
    );

    server.on("close", () => clearTimeout(timeout));
  });
}

// ─── Token Exchange ──────────────────────────────────────────────────────────

interface ExchangeParams {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}

async function exchangeCodeForTokens(
  params: ExchangeParams
): Promise<TokenInfo> {
  const response = await fetch(LINEAR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope ?? SCOPES,
  };
}

// ─── HTML Response ───────────────────────────────────────────────────────────

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>Locus Linear - ${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
  h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
  p { color: #666; margin: 0; }
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body>
</html>`;
}
