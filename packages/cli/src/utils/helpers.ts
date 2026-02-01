import { existsSync } from "node:fs";
import { join } from "node:path";
import { type AiProvider, c, LOCUS_CONFIG, PROVIDER } from "@locusai/sdk/node";

/**
 * Check if a project has been initialized with Locus
 */
export function isProjectInitialized(projectPath: string): boolean {
  const locusDir = join(projectPath, LOCUS_CONFIG.dir);
  const configPath = join(locusDir, LOCUS_CONFIG.configFile);
  return existsSync(locusDir) && existsSync(configPath);
}

/**
 * Require that a project is initialized before running a command
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
 * Resolve and validate AI provider from input string
 */
export function resolveProvider(input?: string): AiProvider {
  if (!input) return PROVIDER.CLAUDE;
  if (input === PROVIDER.CLAUDE || input === PROVIDER.CODEX) return input;

  console.error(
    c.error(`Error: invalid provider '${input}'. Use 'claude' or 'codex'.`)
  );
  process.exit(1);
}
