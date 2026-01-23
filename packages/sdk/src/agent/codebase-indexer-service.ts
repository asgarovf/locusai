import type { AnthropicClient } from "../ai/anthropic-client";
import type { ClaudeRunner } from "../ai/claude-runner";
import { CodebaseIndexer } from "../core/indexer";

export interface CodebaseIndexerServiceDeps {
  anthropicClient: AnthropicClient | null;
  claudeRunner: ClaudeRunner;
  projectPath: string;
  log: (message: string, level?: "info" | "success" | "warn" | "error") => void;
}

/**
 * Handles codebase indexing with AI analysis
 */
export class CodebaseIndexerService {
  private indexer: CodebaseIndexer;

  constructor(private deps: CodebaseIndexerServiceDeps) {
    this.indexer = new CodebaseIndexer(deps.projectPath);
  }

  async reindex(): Promise<void> {
    try {
      this.deps.log("Reindexing codebase...", "info");

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

          let response: string;

          if (this.deps.anthropicClient) {
            // Use Anthropic SDK with caching for faster indexing
            response = await this.deps.anthropicClient.run({
              systemPrompt:
                "You are a codebase analysis expert specialized in extracting structure and symbols from file trees.",
              userPrompt: prompt,
            });
          } else {
            // Fallback to Claude CLI
            response = await this.deps.claudeRunner.run(prompt, true);
          }

          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return { symbols: {}, responsibilities: {}, lastIndexed: "" };
        }
      );
      this.indexer.saveIndex(index);
      this.deps.log("Codebase reindexed successfully", "success");
    } catch (error) {
      this.deps.log(`Failed to reindex codebase: ${error}`, "error");
    }
  }
}
