/**
 * Auto-capture module — extracts reusable lessons from AI session transcripts
 * and appends them to the structured `.locus/memory/` directory.
 *
 * Runs post-session as fire-and-forget: all errors are caught and logged,
 * the function never throws.
 */

import { spawn } from "node:child_process";
import { getLogger } from "./logger.js";
import { MEMORY_CATEGORIES, appendMemoryEntries, readAllMemory } from "./memory.js";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Rough character limit for transcript (~8000 tokens × 4 chars/token). */
const TRANSCRIPT_MAX_CHARS = 32_000;

/** Valid category keys from the memory module. */
const VALID_CATEGORIES = new Set(Object.keys(MEMORY_CATEGORIES));

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExtractedEntry {
  category: string;
  text: string;
}

// ─── Transcript Preparation ─────────────────────────────────────────────────

/**
 * Formats session messages into a readable transcript string and
 * truncates to stay within token budget.
 */
export function prepareTranscript(
  messages: Array<{ role: string; content: string }>
): string {
  if (!messages || messages.length === 0) return "";

  const lines: string[] = [];
  for (const msg of messages) {
    const label = msg.role === "user" ? "User" : "Assistant";
    lines.push(`### ${label}\n${msg.content}`);
  }

  let transcript = lines.join("\n\n");

  if (transcript.length > TRANSCRIPT_MAX_CHARS) {
    transcript = transcript.slice(0, TRANSCRIPT_MAX_CHARS) + "\n\n...(truncated)";
  }

  return transcript;
}

// ─── Extraction Prompt ──────────────────────────────────────────────────────

function buildExtractionPrompt(transcript: string, existingMemory: string): string {
  const categoryList = Object.entries(MEMORY_CATEGORIES)
    .map(([key, meta]) => `- "${key}": ${meta.title} — ${meta.description}`)
    .join("\n");

  return `You are a memory extraction assistant. Extract project-level reusable lessons from the following session transcript.

## Valid Categories

${categoryList}

## Existing Memory (for deduplication)

Do NOT extract entries that duplicate or closely overlap with these existing entries:

<existing-memory>
${existingMemory || "(none)"}
</existing-memory>

## Quality Bar

Only extract entries that would help a new agent on a future task. Skip:
- Session-specific details or in-progress work
- One-time fixes or trivial observations
- Speculative or unverified conclusions
- Anything that duplicates existing memory entries above

## Output Format

Respond with ONLY a JSON array. No markdown fencing, no explanation. Example:
[{"category": "architecture", "text": "SDK types are shared via @locusai/shared package"}]

If there are no extractable lessons, respond with: []

## Session Transcript

${transcript}`;
}

// ─── AI Call ────────────────────────────────────────────────────────────────

/**
 * Calls the `claude` CLI with --print to get a single-shot response.
 * Uses a lightweight model for cost efficiency.
 */
function callExtractionAI(
  prompt: string,
  model?: string
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const args = ["--print", "--dangerously-skip-permissions", "--no-session-persistence"];
    if (model) {
      args.push("--model", model);
    }

    // Remove Claude Code env vars to prevent nested session detection
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;

    const proc = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });

    let output = "";
    let errorOutput = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({
          success: false,
          output,
          error: errorOutput || `claude exited with code ${code}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: "",
        error: `Failed to spawn claude: ${err.message}`,
      });
    });

    // Write prompt via stdin and close
    proc.stdin?.write(prompt);
    proc.stdin?.end();
  });
}

// ─── JSON Parsing ───────────────────────────────────────────────────────────

/**
 * Parses the AI response as a JSON array of entries.
 * Handles common issues: markdown fencing, extra text around JSON.
 */
function parseExtractionResponse(raw: string): ExtractedEntry[] {
  let text = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Try to find a JSON array in the text
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];

  const parsed = JSON.parse(arrayMatch[0]);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (item): item is ExtractedEntry =>
      typeof item === "object" &&
      item !== null &&
      typeof item.category === "string" &&
      typeof item.text === "string"
  );
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Extracts reusable lessons from a session transcript and appends them
 * to the structured memory directory.
 *
 * This function is fire-and-forget: it catches all errors internally
 * and never throws. Safe to call post-execution without disrupting
 * the user flow.
 */
export async function captureMemoryFromSession(
  projectRoot: string,
  transcript: string,
  config: { model?: string }
): Promise<{ captured: number }> {
  const log = getLogger();

  try {
    if (!transcript.trim()) {
      return { captured: 0 };
    }

    // 1. Read existing memory for deduplication context
    const existingMemory = await readAllMemory(projectRoot);

    // 2. Build extraction prompt
    const prompt = buildExtractionPrompt(transcript, existingMemory);

    // 3. Call AI for extraction
    const result = await callExtractionAI(prompt, config.model);
    if (!result.success) {
      log.warn("Memory capture: AI call failed", { error: result.error });
      return { captured: 0 };
    }

    // 4. Parse JSON response
    let entries: ExtractedEntry[];
    try {
      entries = parseExtractionResponse(result.output);
    } catch (e) {
      log.warn("Memory capture: failed to parse AI response", {
        error: e instanceof Error ? e.message : String(e),
      });
      return { captured: 0 };
    }

    if (entries.length === 0) {
      return { captured: 0 };
    }

    // 5. Filter to valid categories only
    const validEntries = entries.filter((entry) => {
      if (!VALID_CATEGORIES.has(entry.category)) {
        log.debug("Memory capture: skipping invalid category", {
          category: entry.category,
        });
        return false;
      }
      return true;
    });

    if (validEntries.length === 0) {
      return { captured: 0 };
    }

    // 6. Persist new entries
    await appendMemoryEntries(projectRoot, validEntries);

    log.debug("Memory capture: extracted entries", {
      count: validEntries.length,
    });

    return { captured: validEntries.length };
  } catch (e) {
    log.warn("Memory capture: unexpected error", {
      error: e instanceof Error ? e.message : String(e),
    });
    return { captured: 0 };
  }
}
