import { c, LocusClient } from "@locusai/sdk/node";
import { ConfigManager } from "./config-manager";

export interface ResolverOptions {
  apiKey: string;
  apiBase: string;
  workspaceId?: string;
}

export class WorkspaceResolver {
  constructor(
    private configManager: ConfigManager,
    private options: ResolverOptions
  ) {}

  async resolve(): Promise<string> {
    // 1. If workspace ID is provided in CLI, use it and don't save
    if (this.options.workspaceId) {
      return this.options.workspaceId;
    }

    // 2. Try to get from config
    const persistedId = this.configManager.getWorkspaceId();
    if (persistedId) {
      return persistedId;
    }

    // 3. Resolve from API
    try {
      console.log(c.dim("ℹ  Resolving workspace from API key..."));
      const client = new LocusClient({
        baseUrl: this.options.apiBase,
        token: this.options.apiKey,
      });

      const info = await client.auth.getApiKeyInfo();

      if (info.workspaceId) {
        // Save for future use
        this.configManager.setWorkspaceId(info.workspaceId);
        console.log(c.success(`✓  Resolved workspace: ${info.workspaceId}`));
        return info.workspaceId;
      }

      throw new Error(
        "API key is not associated with a workspace. Please specify --workspace."
      );
    } catch (error) {
      throw new Error(
        `Error resolving workspace: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
