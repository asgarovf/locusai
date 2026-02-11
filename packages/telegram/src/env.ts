import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Extra PATH directories to search for binaries like `bun`, `node`, `locus`.
 *
 * When the Telegram bot runs as a systemd service (or any non-interactive context),
 * the inherited PATH is minimal and typically misses user-installed tools.
 * We augment PATH with the most common installation locations.
 */
function extraPathDirs(): string[] {
  const home = homedir();
  return [
    join(home, ".bun", "bin"),
    join(home, ".nvm", "current", "bin"),
    join(home, ".local", "bin"),
    "/usr/local/bin",
  ];
}

/**
 * Build the environment variables for spawned child processes.
 * Prepends common binary directories to PATH so that tools like `bun`
 * are found even when the bot runs outside an interactive shell.
 */
export function buildSpawnEnv(): Record<string, string | undefined> {
  const existing = process.env.PATH ?? "";
  const extras = extraPathDirs().filter((d) => !existing.includes(d));
  const augmentedPath = [...extras, existing].filter(Boolean).join(":");

  return {
    ...process.env,
    PATH: augmentedPath,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
  };
}
