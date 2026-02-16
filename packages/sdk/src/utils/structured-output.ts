import { z } from "zod";
import { extractJsonFromLLMOutput } from "./json-extractor.js";

/**
 * Parse raw LLM output into a typed object validated by a Zod schema.
 *
 * Steps:
 * 1. Extract JSON from the raw LLM text (handles markdown blocks, surrounding prose)
 * 2. Parse the extracted string with JSON.parse
 * 3. Validate + coerce through the provided Zod schema
 *
 * On failure, throws with an actionable error message that includes
 * the Zod validation issues so callers can log or surface them.
 */
export function parseJsonWithSchema<T extends z.ZodType>(
  raw: string,
  schema: T
): z.output<T> {
  const jsonStr = extractJsonFromLLMOutput(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    const preview = jsonStr.slice(0, 200);
    throw new Error(
      `Failed to parse JSON from LLM output: ${err instanceof Error ? err.message : String(err)}\nExtracted text preview: ${preview}`
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map(
        (issue: z.core.$ZodIssue) =>
          `  - ${issue.path.join(".")}: ${issue.message}`
      )
      .join("\n");
    throw new Error(
      `LLM output failed schema validation:\n${issues}\nParsed JSON preview: ${JSON.stringify(parsed).slice(0, 300)}`
    );
  }

  return result.data;
}
