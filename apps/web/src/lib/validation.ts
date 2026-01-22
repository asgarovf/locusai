/**
 * Validation Utilities
 *
 * Centralized validation schemas and helpers using Zod.
 */

import { z } from "zod";

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // String validations
  email: z.string().email("Invalid email address"),
  url: z.string().url("Invalid URL"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),

  // Numeric validations
  positiveInt: z.number().int().positive(),
  nonNegativeInt: z.number().int().nonnegative(),

  // Sprint validation
  sprint: z.object({
    name: z.string().min(1, "Sprint name is required").trim(),
    description: z.string().optional().default(""),
  }),

  // Task validation
  task: z.object({
    title: z.string().min(1, "Task title is required").trim(),
    description: z.string().optional().default(""),
    status: z.string().optional(),
  }),

  // Comment validation
  comment: z.object({
    content: z.string().min(1, "Comment cannot be empty").trim(),
  }),

  // Checklist item
  checklistItem: z.object({
    text: z.string().min(1, "Checklist item cannot be empty").trim(),
    completed: z.boolean().default(false),
  }),
};

/**
 * Validate data against a schema
 * Returns { success: boolean, data?: T, error?: string }
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; error?: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return { success: false, error: message };
    }
    return { success: false, error: "Validation failed" };
  }
}

/**
 * Safe parse - returns null on error
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}
