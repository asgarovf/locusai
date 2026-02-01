import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Get the CLI version from package.json
 */
export function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // When bundled, the output is in bin/locus.js, so go up one level to find package.json
    // When running from source, we're in src/utils/, so we need to go up two levels
    const bundledPath = join(__dirname, "..", "package.json");
    const sourcePath = join(__dirname, "..", "..", "package.json");

    if (existsSync(bundledPath)) {
      const pkg = JSON.parse(readFileSync(bundledPath, "utf-8"));
      if (pkg.name === "@locusai/cli") {
        return pkg.version || "0.0.0";
      }
    }

    if (existsSync(sourcePath)) {
      const pkg = JSON.parse(readFileSync(sourcePath, "utf-8"));
      if (pkg.name === "@locusai/cli") {
        return pkg.version || "0.0.0";
      }
    }
  } catch {
    // Silent fallback
  }
  return "0.0.0";
}

export const VERSION = getVersion();
