/**
 * Extract a JSON object string from LLM output that may contain
 * surrounding prose, markdown code blocks, or other non-JSON text.
 */
export function extractJsonFromLLMOutput(raw: string): string {
  const trimmed = raw.trim();

  // 1. Try markdown code block extraction first
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1]?.trim() || "";
  }

  // 2. If the whole string is already valid JSON, return it
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  // 3. Find the first top-level '{' and its matching '}' by tracking brace depth
  const startIdx = trimmed.indexOf("{");
  if (startIdx === -1) {
    return trimmed; // No JSON object found; let JSON.parse produce the error
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIdx; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
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
        return trimmed.slice(startIdx, i + 1);
      }
    }
  }

  // If we never balanced, return from the first '{' onward and let JSON.parse report the error
  return trimmed.slice(startIdx);
}
