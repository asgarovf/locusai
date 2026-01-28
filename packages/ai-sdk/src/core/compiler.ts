import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const taskExtractionSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
      estimatedComplexity: z.enum(["low", "medium", "high"]),
      dependencies: z.array(z.string()).optional(),
    })
  ),
  warnings: z.array(z.string()).optional(),
});

export class DocumentCompiler {
  constructor(private llm: BaseChatModel) {}

  async compile(
    documentContent: string,
    documentType: string
  ): Promise<z.infer<typeof taskExtractionSchema>> {
    const prompt = PromptTemplate.fromTemplate(
      `You are a Senior Technical Architect transforming a document into actionable engineering tasks.

DOCUMENT TYPE: {docType}
CONTENT:
{content}

INSTRUCTIONS:
1. Analyze the document content carefully.
2. Break it down into discrete, implementable engineering tasks.
3. For each task:
   - Provide a clear, technical title.
   - Write a detailed description referencing specific sections of the doc.
   - List verifiable acceptance criteria (must-haves).
   - Estimate complexity (low/medium/high).
   - Identify dependencies if one task strictly relies on another.
4. If sections are vague or lack actionable items, add a "warning" to the response.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this structure:
{{
  "tasks": [
    {{
      "title": "string",
      "description": "string",
      "acceptanceCriteria": ["string"],
      "estimatedComplexity": "low" | "medium" | "high",
      "dependencies": ["string"]
    }}
  ],
  "warnings": ["string"]
}}

Do NOT include any markdown formatting (like \`\`\`json). Just the raw JSON string.`
    );

    const chain = prompt.pipe(this.llm);

    const response = await chain.invoke({
      docType: documentType,
      content: documentContent,
    });

    const content = response.content as string;

    try {
      const cleaned = this.cleanJsonOutput(content);
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("[DocumentCompiler] Failed to parse JSON:", content);
      const errorMessage = (e as Error).message;
      throw new Error(
        `Failed to parse compiler output: ${errorMessage}. Raw output: ${content}`
      );
    }
  }

  private cleanJsonOutput(output: string): string {
    let clean = output.trim();
    // Remove markdown code blocks if present
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json/, "").replace(/```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "").replace(/```$/, "");
    }
    return clean.trim();
  }
}
