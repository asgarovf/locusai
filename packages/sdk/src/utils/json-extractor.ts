/**
 * Extract a JSON object string from LLM output.
 *
 * Handles common LLM output patterns:
 * - Pure JSON
 * - JSON wrapped in markdown code fences
 * - JSON preceded/followed by prose text
 */
export function extractJsonFromLLMOutput(raw: string): string {
  const trimmed = raw.trim();

  // 1. Try to extract from markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // 2. Find the first top-level { ... } by matching braces
  const start = trimmed.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let isEscape = false;

    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];

      if (isEscape) {
        isEscape = false;
        continue;
      }

      if (ch === "\\") {
        isEscape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return trimmed.slice(start, i + 1);
        }
      }
    }
  }

  // 3. Fallback: return trimmed input (will likely fail JSON.parse, but
  //    gives the caller the best possible error message)
  return trimmed;
}
