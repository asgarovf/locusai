import { DynamicStructuredTool } from "@langchain/core/tools";
import { generateUUID } from "@locusai/shared";
import { z } from "zod";
import { DocumentCompiler } from "../core/compiler";
import { IDocProvider } from "./interfaces";

export const createCompileDocumentTool = (
  compiler: DocumentCompiler,
  docProvider: IDocProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "compile_document_to_tasks",
    description:
      "Compile a document (PRD, Spec, etc.) into a list of actionable engineering tasks. ALWAYS use a real docId found via 'list_documents'. Do NOT guess or use placeholders like '12345'.",
    schema: z.object({
      docId: z
        .string()
        .describe("The UUID of the document to compile. Must be a real ID."),
    }),
    func: async ({ docId }) => {
      try {
        // 1. Fetch Document
        const doc = await docProvider.getById(docId, workspaceId);
        if (!doc) throw new Error(`Document ${docId} not found`);

        // 2. Run Compiler
        const result = await compiler.compile(doc.content, "Unknown Type"); // TODO: Use doc.type when available in provider return type

        // 3. Return structured tasks (will be parsed by ToolHandler)
        return JSON.stringify({
          success: true,
          message: `Compiled ${result.tasks.length} tasks from "${doc.title}"`,
          tasks: result.tasks.map((t) => ({
            id: `temp-${generateUUID()}`, // Temp ID, ToolHandler or UI should handle creation confirm
            title: t.title,
            description: t.description,
            status: "BACKLOG",
            // We include extra metadata for the UI/Agent to use later
            metadata: {
              acceptanceCriteria: t.acceptanceCriteria,
              complexity: t.estimatedComplexity,
              dependencies: t.dependencies,
              sourceDocId: docId,
            },
          })),
          warnings: result.warnings,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to compile document",
        });
      }
    },
  });
