import { LogFn } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";
import { CodebaseIndexer } from "../core/indexer.js";
import { extractJsonFromLLMOutput } from "../utils/json-extractor.js";

export interface CodebaseIndexerServiceDeps {
  aiRunner: AiRunner;
  projectPath: string;
  log: LogFn;
}

/**
 * Handles codebase indexing with AI analysis
 */
export class CodebaseIndexerService {
  private indexer: CodebaseIndexer;

  constructor(private deps: CodebaseIndexerServiceDeps) {
    this.indexer = new CodebaseIndexer(deps.projectPath);
  }

  async reindex(force = false): Promise<void> {
    try {
      const index = await this.indexer.index(
        (msg) => this.deps.log(msg, "info"),
        async (tree: string) => {
          const prompt = `<codebase_analysis>
Analyze this codebase file tree and extract key information.

<file_tree>
${tree}
</file_tree>

<rules>
- Extract key symbols (classes, functions, types) and their file locations
- Identify responsibilities of each directory/file
- Map overall project structure
</rules>

<output>
Return ONLY valid JSON (no code fences, no markdown):
{
  "symbols": { "symbolName": ["file/path.ts"] },
  "responsibilities": { "path": "brief description" }
}
</output>
</codebase_analysis>`;

          const response = await this.deps.aiRunner.run(prompt);

          try {
            const jsonStr = extractJsonFromLLMOutput(response);
            return JSON.parse(jsonStr);
          } catch {
            return { symbols: {}, responsibilities: {}, lastIndexed: "" };
          }
        },
        force
      );

      // null means no changes detected, skip was successful
      if (index === null) {
        this.deps.log("No changes detected, skipping reindex", "info");
        return;
      }

      this.indexer.saveIndex(index);
      this.deps.log("Codebase reindexed successfully", "success");
    } catch (error) {
      this.deps.log(`Failed to reindex codebase: ${error}`, "error");
    }
  }
}
