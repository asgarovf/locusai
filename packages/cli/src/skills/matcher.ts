// ---------------------------------------------------------------------------
// Skills – relevance matcher
//
// Scores installed skills against issue context (title, body, labels) to
// determine which skills are relevant. Only relevant skills are injected
// into the execution prompt, keeping token usage low.
// ---------------------------------------------------------------------------

export interface SkillMeta {
  name: string;
  description: string;
  tags: string[];
}

export interface IssueContext {
  title: string;
  body: string;
  labels: string[];
}

interface ScoredSkill {
  skill: SkillMeta;
  score: number;
}

/** Default minimum score for a skill to be considered relevant. */
const RELEVANCE_THRESHOLD = 2;

/** Maximum number of skills to include even if many match. */
const MAX_SKILLS = 5;

/** Fallback: if nothing matches, include top N skills. */
const FALLBACK_COUNT = 3;

/**
 * Score and filter installed skills by relevance to the given issue.
 *
 * Scoring:
 *  - Label ↔ tag match:          5 points (strongest signal)
 *  - Issue title word ↔ tag:     3 points
 *  - Issue body word ↔ tag:      2 points
 *  - Title word ↔ description:   1 point
 *  - Body word ↔ description:    0.5 points
 *
 * Returns only skills above the threshold, capped at MAX_SKILLS.
 * If nothing reaches the threshold, returns the top FALLBACK_COUNT.
 */
export function matchRelevantSkills(
  issue: IssueContext,
  skills: SkillMeta[]
): SkillMeta[] {
  if (skills.length <= MAX_SKILLS) return skills;

  const titleTokens = tokenize(issue.title);
  const bodyTokens = tokenize(issue.body).slice(0, 200); // Cap body tokens
  const labelTokens = issue.labels.flatMap((l) => tokenize(l));

  const scored: ScoredSkill[] = skills.map((skill) => {
    let score = 0;

    const tagSet = new Set(skill.tags.map((t) => t.toLowerCase()));
    const descTokens = new Set(tokenize(skill.description));

    // Label ↔ tag (weight 5)
    for (const lt of labelTokens) {
      if (tagSet.has(lt)) score += 5;
    }

    // Title word ↔ tag (weight 3)
    for (const tw of titleTokens) {
      if (tagSet.has(tw)) score += 3;
    }

    // Body word ↔ tag (weight 2)
    for (const bw of bodyTokens) {
      if (tagSet.has(bw)) score += 2;
    }

    // Title word ↔ description (weight 1)
    for (const tw of titleTokens) {
      if (descTokens.has(tw)) score += 1;
    }

    // Body word ↔ description (weight 0.5)
    for (const bw of bodyTokens) {
      if (descTokens.has(bw)) score += 0.5;
    }

    return { skill, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Filter by threshold
  const relevant = scored.filter((s) => s.score >= RELEVANCE_THRESHOLD);

  if (relevant.length > 0) {
    return relevant.slice(0, MAX_SKILLS).map((s) => s.skill);
  }

  // Fallback: return top N even if below threshold
  return scored.slice(0, FALLBACK_COUNT).map((s) => s.skill);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "it",
  "to",
  "in",
  "on",
  "of",
  "for",
  "and",
  "or",
  "not",
  "with",
  "this",
  "that",
  "from",
  "by",
  "as",
  "at",
  "be",
  "we",
  "i",
  "you",
  "my",
  "our",
  "do",
  "if",
  "no",
  "so",
  "up",
  "can",
  "all",
  "but",
  "has",
  "had",
  "have",
  "will",
  "should",
  "would",
  "could",
  "need",
  "want",
  "also",
  "new",
  "use",
  "add",
  "make",
]);

/**
 * Tokenize text into lowercase words, removing stop words and short tokens.
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}
