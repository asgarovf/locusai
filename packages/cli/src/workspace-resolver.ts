import {
  WorkspaceResolver as BaseWorkspaceResolver,
  type WorkspaceResolverOptions,
} from "@locusai/commands";
import { c } from "@locusai/sdk/node";

export type ResolverOptions = Omit<WorkspaceResolverOptions, "log">;

/**
 * CLI-specific workspace resolver that adds colored terminal logging.
 */
export class WorkspaceResolver extends BaseWorkspaceResolver {
  constructor(options: ResolverOptions) {
    super({
      ...options,
      log: (msg) => console.log(c.dim(`ℹ  ${msg}`)),
    });
  }
}
