import type { AiRunner } from "@locusai/sdk/node";
import { CodebaseIndex, extractJsonFromLLMOutput } from "@locusai/sdk/node";

export class TreeSummarizer {
  constructor(private aiRunner: AiRunner) {}

  async summarize(tree: string): Promise<CodebaseIndex> {
    const prompt = `Analyze this file tree and generate a JSON index.
Return ONLY a JSON object with this structure:
{
  "symbols": {},
  "responsibilities": { "path": "Description" }
}

File Tree:
${tree}`;

    const output = await this.aiRunner.run(prompt);

    const jsonStr = extractJsonFromLLMOutput(output);
    return JSON.parse(jsonStr);
  }
}
