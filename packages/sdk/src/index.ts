import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { LocusConfig, LocusEmitter, LocusEvent } from "./events.js";
import { AuthModule } from "./modules/auth.js";
import { CiModule } from "./modules/ci.js";
import { DocsModule } from "./modules/docs.js";
import { InvitationsModule } from "./modules/invitations.js";
import { OrganizationsModule } from "./modules/organizations.js";
import { SprintsModule } from "./modules/sprints.js";
import { TasksModule } from "./modules/tasks.js";
import { WorkspacesModule } from "./modules/workspaces.js";
import { RetryOptions } from "./utils/retry.js";

// Browser-safe exports only
export * from "./events.js";
export * from "./modules/auth.js";
export * from "./modules/ci.js";
export * from "./modules/docs.js";
export * from "./modules/invitations.js";
export * from "./modules/organizations.js";
export * from "./modules/sprints.js";
export * from "./modules/tasks.js";
export * from "./modules/workspaces.js";

export class LocusClient {
  private readonly api: AxiosInstance;
  public readonly emitter: LocusEmitter;

  public readonly auth: AuthModule;
  public readonly tasks: TasksModule;
  public readonly sprints: SprintsModule;
  public readonly workspaces: WorkspacesModule;
  public readonly organizations: OrganizationsModule;
  public readonly invitations: InvitationsModule;
  public readonly docs: DocsModule;
  public readonly ci: CiModule;

  constructor(config: LocusConfig) {
    this.emitter = new LocusEmitter();

    this.api = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
    });

    this.setupInterceptors();

    // Initialize modules
    this.auth = new AuthModule(this.api, this.emitter);
    this.tasks = new TasksModule(this.api, this.emitter);
    this.sprints = new SprintsModule(this.api, this.emitter);
    this.workspaces = new WorkspacesModule(this.api, this.emitter);
    this.organizations = new OrganizationsModule(this.api, this.emitter);
    this.invitations = new InvitationsModule(this.api, this.emitter);
    this.docs = new DocsModule(this.api, this.emitter);
    this.ci = new CiModule(this.api, this.emitter);

    if (config.retryOptions) {
      this.setupRetryInterceptor(config.retryOptions);
    }
  }

  private setupRetryInterceptor(retryOptions: RetryOptions) {
    this.api.interceptors.response.use(undefined, async (error) => {
      const config = error.config as InternalAxiosRequestConfig & {
        _retryCount?: number;
      };

      if (!config || !retryOptions) {
        return Promise.reject(error);
      }

      config._retryCount = config._retryCount || 0;

      const maxRetries = retryOptions.maxRetries ?? 3;
      const shouldRetry =
        config._retryCount < maxRetries &&
        (retryOptions.retryCondition
          ? retryOptions.retryCondition(error)
          : !error.response || error.response.status >= 500);

      if (shouldRetry) {
        config._retryCount++;
        const delay = Math.min(
          (retryOptions.initialDelay ?? 1000) *
            Math.pow(retryOptions.factor ?? 2, config._retryCount - 1),
          retryOptions.maxDelay ?? 5000
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.api(config);
      }

      return Promise.reject(error);
    });
  }

  private setupInterceptors() {
    this.api.interceptors.response.use(
      (response) => {
        if (
          response.data &&
          typeof response.data === "object" &&
          "data" in response.data
        ) {
          response.data = response.data.data;
        }
        return response;
      },
      (error) => {
        const status = error.response?.status;

        // Extract error message from API response format: { error: { message: "..." } }
        let message: string;

        // Try to get message from API error response
        if (
          error.response?.data?.error?.message &&
          typeof error.response.data.error.message === "string"
        ) {
          message = error.response.data.error.message;
        } else if (
          error.response?.data?.message &&
          typeof error.response.data.message === "string"
        ) {
          message = error.response.data.message;
        } else if (error.message && typeof error.message === "string") {
          message = error.message;
        } else {
          message = "An error occurred";
        }

        // Create a new error with a meaningful message
        const enhancedError = new Error(message);
        enhancedError.name = `HTTP${status || "Error"}`;

        if (status === 401) {
          this.emitter.emit(LocusEvent.TOKEN_EXPIRED);
          this.emitter.emit(LocusEvent.AUTH_ERROR, enhancedError);
        } else {
          this.emitter.emit(LocusEvent.REQUEST_ERROR, enhancedError);
        }

        return Promise.reject(enhancedError);
      }
    );
  }

  public setToken(token: string | null) {
    if (token) {
      this.api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common.Authorization;
    }
  }
}
