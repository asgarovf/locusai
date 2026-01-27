import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
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
    const parser = new JsonOutputParser<z.infer<typeof taskExtractionSchema>>();

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

{format_instructions}`
    );

    const chain = prompt.pipe(this.llm).pipe(parser);

    return await chain.invoke({
      docType: documentType,
      content: documentContent,
      format_instructions: parser.getFormatInstructions(),
    });
  }
}
