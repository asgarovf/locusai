import {
  resolveProvider as baseResolveProvider,
  isProjectInitialized,
} from "@locusai/commands";
import { type AiProvider, c } from "@locusai/sdk/node";

// Re-export for use in CLI commands
export { isProjectInitialized };

/**
 * Require that a project is initialized before running a command.
 * CLI-specific: prints colored error and exits the process.
 */
export function requireInitialization(
  projectPath: string,
  command: string
): void {
  if (!isProjectInitialized(projectPath)) {
    console.error(`\n  ${c.error("✖ Error")} ${c.red(`Locus is not initialized in this directory.`)}\n
  The '${c.bold(command)}' command requires a Locus project to be initialized.

  To initialize Locus in this directory, run:
    ${c.primary("locus init")}

  This will create a ${c.dim(".locus")} directory with the necessary configuration.
`);
    process.exit(1);
  }
}

/**
 * Resolve and validate AI provider from input string.
 * CLI-specific: prints colored error and exits the process on invalid input.
 */
export function resolveProvider(input?: string): AiProvider {
  try {
    return baseResolveProvider(input);
  } catch {
    console.error(
      c.error(`Error: invalid provider '${input}'. Use 'claude' or 'codex'.`)
    );
    process.exit(1);
  }
}
