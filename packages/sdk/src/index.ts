import axios, { AxiosInstance } from "axios";
import { LocusConfig, LocusEmitter, LocusEvent } from "./events";
import { AuthModule } from "./modules/auth";
import { CiModule } from "./modules/ci";
import { DocsModule } from "./modules/docs";
import { InvitationsModule } from "./modules/invitations";
import { OrganizationsModule } from "./modules/organizations";
import { SprintsModule } from "./modules/sprints";
import { TasksModule } from "./modules/tasks";
import { WorkspacesModule } from "./modules/workspaces";

// Browser-safe exports only
export * from "./events";
export * from "./modules/auth";
export * from "./modules/ci";
export * from "./modules/docs";
export * from "./modules/invitations";
export * from "./modules/organizations";
export * from "./modules/sprints";
export * from "./modules/tasks";
export * from "./modules/workspaces";

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
