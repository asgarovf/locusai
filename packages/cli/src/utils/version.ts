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
    // Go up from utils/ to cli/src/ to cli/
    const packagePath = join(__dirname, "..", "..", "package.json");
    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
      return pkg.version || "0.0.0";
    }
  } catch {
    // Silent fallback
  }
  return "0.0.0";
}

export const VERSION = getVersion();
