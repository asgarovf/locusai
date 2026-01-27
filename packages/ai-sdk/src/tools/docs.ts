import { DynamicStructuredTool } from "@langchain/core/tools";
import { CreateDocSchema } from "@locusai/shared";
import { z } from "zod";
import { IDocProvider } from "./interfaces";

export const createCreateDocTool = (
  provider: IDocProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "create_document",
    description:
      "Create a new document (e.g., PRD, architecture guide, README) for the project. Output should be comprehensive, well-structured, and use professional language.",
    schema: CreateDocSchema,
    func: async (input) => {
      try {
        const doc = await provider.create(workspaceId, input);
        return JSON.stringify({
          success: true,
          message: `Created document "${doc.title}"`,
          docId: doc.id,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create document",
        });
      }
    },
  });

export const createUpdateDocTool = (
  provider: IDocProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "update_document",
    description: "Update an existing document's content.",
    schema: z.object({
      id: z.uuid(),
      content: z.string().optional(),
      title: z.string().optional(),
    }),
    func: async ({ id, content, title }) => {
      try {
        const doc = await provider.update(id, workspaceId, { content, title });
        return JSON.stringify({
          success: true,
          message: `Updated document "${doc.title}"`,
          docId: doc.id,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update document",
        });
      }
    },
  });

export const createReadDocTool = (
  provider: IDocProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "read_document",
    description: "Read the content of a specific document by its ID.",
    schema: z.object({
      id: z.uuid(),
    }),
    func: async ({ id }) => {
      try {
        const doc = await provider.getById(id, workspaceId);
        return JSON.stringify({
          success: true,
          title: doc.title,
          content: doc.content,
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to read document",
        });
      }
    },
  });

export const createListDocsTool = (
  provider: IDocProvider,
  workspaceId: string
) =>
  new DynamicStructuredTool({
    name: "list_documents",
    description: "List all available documents in the current workspace.",
    schema: z.object({}),
    func: async () => {
      try {
        const docs = await provider.list(workspaceId);
        return JSON.stringify({
          success: true,
          count: docs.length,
          documents: docs.map((d) => ({
            id: d.id,
            title: d.title,
            content: d.content,
          })),
        });
      } catch (error: unknown) {
        return JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to list documents",
        });
      }
    },
  });
