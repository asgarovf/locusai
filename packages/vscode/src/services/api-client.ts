import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { loadProjectConfig, loadSettings } from "../utils/config";

const DEFAULT_API_BASE = "https://api.locusai.dev/api";
const REQUEST_TIMEOUT = 30000;

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
}

export interface ApiWorkspace {
  id: string;
  name: string;
  description?: string;
}

export interface ApiTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignedTo?: string;
  sprintId?: string;
}

export interface ApiSprint {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Lightweight API client for the Locus REST API.
 * Uses Node.js built-in https module to avoid adding dependencies.
 */
export class LocusApiClient {
  private apiBase: string;
  private apiKey: string;
  private workspaceId: string | undefined;

  constructor(
    projectPath: string,
    overrides?: {
      apiBase?: string;
      apiKey?: string;
      workspaceId?: string;
    }
  ) {
    const settings = loadSettings(projectPath);
    const config = loadProjectConfig(projectPath);

    this.apiBase = overrides?.apiBase || settings.apiUrl || DEFAULT_API_BASE;
    this.apiKey = overrides?.apiKey || settings.apiKey || "";
    this.workspaceId =
      overrides?.workspaceId || config?.workspaceId || undefined;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  hasWorkspace(): boolean {
    return !!this.workspaceId;
  }

  getWorkspaceId(): string | undefined {
    return this.workspaceId;
  }

  setWorkspaceId(id: string): void {
    this.workspaceId = id;
  }

  /**
   * Make an authenticated API request.
   */
  async request<T>(options: ApiRequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.apiBase + options.path);
      const isHttps = url.protocol === "https:";
      const doRequest = isHttps ? httpsRequest : httpRequest;

      const bodyStr = options.body ? JSON.stringify(options.body) : undefined;

      const req = doRequest(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: options.method,
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            ...(bodyStr
              ? { "Content-Length": Buffer.byteLength(bodyStr) }
              : {}),
          },
          timeout: REQUEST_TIMEOUT,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk: string) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);

              if (
                res.statusCode &&
                res.statusCode >= 200 &&
                res.statusCode < 300
              ) {
                // Unwrap the API envelope: { data: { ... } }
                const result = parsed.data ?? parsed;
                resolve(result as T);
              } else {
                const message =
                  parsed?.error?.message ||
                  parsed?.message ||
                  `HTTP ${res.statusCode}`;
                reject(new Error(message));
              }
            } catch {
              reject(
                new Error(`Invalid JSON response (HTTP ${res.statusCode})`)
              );
            }
          });
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    });
  }

  // --- Workspace endpoints ---

  async listWorkspaces(): Promise<ApiWorkspace[]> {
    const result = await this.request<{
      workspaces: ApiWorkspace[];
    }>({
      method: "GET",
      path: "/workspaces",
    });
    return result.workspaces;
  }

  // --- Task endpoints ---

  async listTasks(workspaceId?: string): Promise<ApiTask[]> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error("No workspace ID configured");
    }

    const result = await this.request<{ tasks: ApiTask[] }>({
      method: "GET",
      path: `/workspaces/${wsId}/tasks`,
    });
    return result.tasks;
  }

  async getTask(taskId: string, workspaceId?: string): Promise<ApiTask> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error("No workspace ID configured");
    }

    const result = await this.request<{ task: ApiTask }>({
      method: "GET",
      path: `/workspaces/${wsId}/tasks/${taskId}`,
    });
    return result.task;
  }

  async updateTask(
    taskId: string,
    updates: Record<string, unknown>,
    workspaceId?: string
  ): Promise<ApiTask> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error("No workspace ID configured");
    }

    const result = await this.request<{ task: ApiTask }>({
      method: "PATCH",
      path: `/workspaces/${wsId}/tasks/${taskId}`,
      body: updates,
    });
    return result.task;
  }

  // --- Sprint endpoints ---

  async getActiveSprint(workspaceId?: string): Promise<ApiSprint | null> {
    const wsId = workspaceId || this.workspaceId;
    if (!wsId) {
      throw new Error("No workspace ID configured");
    }

    try {
      const result = await this.request<{ sprint: ApiSprint }>({
        method: "GET",
        path: `/workspaces/${wsId}/sprints/active`,
      });
      return result.sprint;
    } catch {
      return null;
    }
  }
}
