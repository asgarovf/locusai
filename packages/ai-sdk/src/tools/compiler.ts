import { DynamicStructuredTool } from "@langchain/core/tools";
import { TaskPriority, TaskStatus } from "@locusai/shared";
import { z } from "zod";
import { DocumentCompiler } from "../core/compiler";
import { IDocProvider, ITaskProvider } from "./interfaces";

export const createCompileDocumentTool = (
  compiler: DocumentCompiler,
  docProvider: IDocProvider,
  taskProvider: ITaskProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "compile_document_to_tasks",
    description:
      "Compile a document (PRD, Spec, etc.) into a list of actionable engineering tasks. ALWAYS use a real docId found via 'list_documents'. This will automatically create the tasks in the backlog.",
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

        // 3. Persist tasks to database
        const createdTasks = [];
        for (const t of result.tasks) {
          const newTask = await taskProvider.create(workspaceId, {
            title: t.title,
            description: t.description,
            status: TaskStatus.BACKLOG,
            priority: TaskPriority.MEDIUM,
            labels: [],
            // Metdata not supported by CreateTask interface
            /*
            metadata: {
              acceptanceCriteria: t.acceptanceCriteria,
              complexity: t.estimatedComplexity,
              dependencies: t.dependencies,
              sourceDocId: docId,
            },
            */
          });
          createdTasks.push(newTask);
        }

        // 4. Return structured tasks (will be parsed by ToolHandler)
        return JSON.stringify({
          success: true,
          message: `Compiled and created ${createdTasks.length} tasks from "${doc.title}"`,
          tasks: createdTasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
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
