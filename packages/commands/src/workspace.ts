import { LocusClient } from "@locusai/sdk";
import { noopLogger } from "./logger.js";

export interface WorkspaceResolverOptions {
  apiKey: string;
  apiBase: string;
  workspaceId?: string;
  log?: (message: string) => void;
}

export class WorkspaceResolver {
  constructor(private options: WorkspaceResolverOptions) {}

  async resolve(): Promise<string> {
    if (this.options.workspaceId) {
      return this.options.workspaceId;
    }

    const log = this.options.log ?? noopLogger;

    try {
      log("Resolving workspace from API key...");
      const client = new LocusClient({
        baseUrl: this.options.apiBase,
        token: this.options.apiKey,
      });

      const info = await client.auth.getApiKeyInfo();

      if (info.workspaceId) {
        log(`Resolved workspace: ${info.workspaceId}`);
        return info.workspaceId;
      }

      throw new Error(
        "API key is not associated with a workspace. Please specify a workspace ID."
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("API key is not")) {
        throw error;
      }
      throw new Error(
        `Error resolving workspace: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Convenience function to resolve workspace ID.
 * If workspaceId is provided, returns it directly.
 * Otherwise resolves from API key info.
 */
export async function resolveWorkspaceId(
  client: LocusClient,
  workspaceId?: string
): Promise<string> {
  if (workspaceId) {
    return workspaceId;
  }

  const info = await client.auth.getApiKeyInfo();
  if (info.workspaceId) {
    return info.workspaceId;
  }

  throw new Error(
    "Could not resolve workspace from API key. Please set workspaceId in settings."
  );
}
