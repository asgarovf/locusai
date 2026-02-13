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
          const prompt = `You are a codebase analysis expert. Analyze the file tree and extract:
1. Key symbols (classes, functions, types) and their locations
2. Responsibilities of each directory/file
3. Overall project structure

Analyze this file tree and provide a JSON response with:
- "symbols": object mapping symbol names to file paths (array)
- "responsibilities": object mapping paths to brief descriptions

File tree:
${tree}

Return ONLY valid JSON, no markdown formatting.`;

          const response = await this.deps.aiRunner.run(prompt);

          const jsonStr = extractJsonFromLLMOutput(response);
          try {
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
