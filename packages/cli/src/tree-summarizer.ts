import type { AiRunner } from "@locusai/sdk/node";
import { CodebaseIndex } from "@locusai/sdk/node";

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

    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Could not find JSON in AI output");
  }
}
