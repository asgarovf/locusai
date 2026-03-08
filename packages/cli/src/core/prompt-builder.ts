/**
 * Prompt builder — assembles context for AI agent execution.
 * Builds structured prompts from issue context, sprint state,
 * project instructions (LOCUS.md), and repository context.
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readAllMemorySync, getMemoryDir } from "./memory.js";
import { CLAUDE_SKILLS_DIR } from "../skills/types.js";
import type { Issue, LocusConfig } from "../types.js";

const MEMORY_MAX_CHARS = 4000;

// ─── Prompt Builders ────────────────────────────────────────────────────────

export interface PromptContext {
  issue: Issue;
  issueComments?: string[];
  config: LocusConfig;
  projectRoot: string;
  /** Sprint context: what previous tasks accomplished (diff summary). */
  sprintContext?: string;
  /** Position in sprint, e.g., "3 of 5". */
  sprintPosition?: string;
  /** Sprint name for contextual awareness. */
  sprintName?: string;
}

export interface FeedbackContext {
  issue: Issue;
  config: LocusConfig;
  projectRoot: string;
  prDiff: string;
  prComments: string[];
  prNumber: number;
}

/** Build the execution prompt for an issue. */
export function buildExecutionPrompt(ctx: PromptContext): string {
  const sections: string[] = [];

  // System context
  sections.push(buildSystemContext(ctx.projectRoot));

  // Installed skills (compact index — agent reads full content from disk if relevant)
  const skills = buildSkillsContext(ctx.projectRoot);
  if (skills) sections.push(skills);

  // Task context
  sections.push(buildTaskContext(ctx.issue, ctx.issueComments));

  // Sprint context (if part of a sprint)
  if (ctx.sprintContext || ctx.sprintPosition) {
    sections.push(
      buildSprintContext(ctx.sprintName, ctx.sprintPosition, ctx.sprintContext)
    );
  }

  // Repository context
  sections.push(buildRepoContext(ctx.projectRoot));

  // Execution rules
  sections.push(buildExecutionRules(ctx.config));

  return sections.join("\n\n---\n\n");
}

/** Build the feedback/iterate prompt for addressing PR review comments. */
export function buildFeedbackPrompt(ctx: FeedbackContext): string {
  const sections: string[] = [];

  // System context
  sections.push(buildSystemContext(ctx.projectRoot));

  // Installed skills
  const skills = buildSkillsContext(ctx.projectRoot);
  if (skills) sections.push(skills);

  // Original task
  sections.push(buildTaskContext(ctx.issue));

  // Current state — PR diff and comments
  sections.push(buildPRContext(ctx.prNumber, ctx.prDiff, ctx.prComments));

  // Instructions for addressing feedback
  sections.push(buildFeedbackInstructions());

  return sections.join("\n\n---\n\n");
}

/** Build a prompt for the interactive REPL. */
export function buildReplPrompt(
  userMessage: string,
  projectRoot: string,
  _config: LocusConfig,
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>
): string {
  const sections: string[] = [];

  // System context (lighter — just LOCUS.md + learnings)
  const locusmd = readFileSafe(join(projectRoot, ".locus", "LOCUS.md"));
  if (locusmd) {
    sections.push(
      `<project-instructions>\n${locusmd}\n</project-instructions>`
    );
  }

  const memory = loadMemoryContent(projectRoot);
  if (memory) {
    sections.push(`<past-learnings>\n${memory}\n</past-learnings>`);
  } else {
    sections.push(
      `<past-learnings>\nNo past learnings recorded yet.</past-learnings>`
    );
  }

  sections.push(
    `<learnings-reminder>IMPORTANT: If during this interaction you discover reusable lessons (architectural patterns, non-obvious constraints, user corrections), record them in the appropriate category file in \`.locus/memory/\` before finishing. This is mandatory — see the "Continuous Learning" section in project instructions.</learnings-reminder>`
  );

  // Previous conversation history (last 10 exchanges for context)
  if (previousMessages && previousMessages.length > 0) {
    const recent = previousMessages.slice(-10);
    const historyLines = recent.map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    );
    sections.push(
      `<previous-conversation>\n${historyLines.join("\n\n")}\n</previous-conversation>`
    );
  }

  // User's current message
  sections.push(`<current-request>\n${userMessage}\n</current-request>`);

  return sections.join("\n\n---\n\n");
}

// ─── Section Builders ───────────────────────────────────────────────────────

/** Reads structured memory from `.locus/memory/`, falling back to `.locus/LEARNINGS.md`. */
function loadMemoryContent(projectRoot: string): string {
  const memoryDir = getMemoryDir(projectRoot);
  if (existsSync(memoryDir)) {
    const content = readAllMemorySync(projectRoot);
    if (content.trim()) {
      return content.length > MEMORY_MAX_CHARS
        ? content.slice(0, MEMORY_MAX_CHARS) + "\n\n...(truncated)"
        : content;
    }
  }

  // Fallback: read flat LEARNINGS.md
  const learnings = readFileSafe(join(projectRoot, ".locus", "LEARNINGS.md"));
  if (learnings) {
    return learnings.length > MEMORY_MAX_CHARS
      ? learnings.slice(0, MEMORY_MAX_CHARS) + "\n\n...(truncated)"
      : learnings;
  }

  return "";
}

function buildSystemContext(projectRoot: string): string {
  const parts: string[] = [];

  // LOCUS.md — primary project instructions
  const locusmd = readFileSafe(join(projectRoot, ".locus", "LOCUS.md"));
  if (locusmd) {
    parts.push(`<project-instructions>\n${locusmd}\n</project-instructions>`);
  }

  const memory = loadMemoryContent(projectRoot);
  if (memory) {
    parts.push(`<past-learnings>\n${memory}\n</past-learnings>`);
  } else {
    parts.push(
      `<past-learnings>\nNo past learnings recorded yet.</past-learnings>`
    );
  }

  // Discussion insights (if any)
  const discussionsDir = join(projectRoot, ".locus", "discussions");
  if (existsSync(discussionsDir)) {
    try {
      const files = readdirSync(discussionsDir)
        .filter((f) => f.endsWith(".md"))
        .slice(0, 3); // Max 3 recent discussions
      for (const file of files) {
        const content = readFileSafe(join(discussionsDir, file));
        if (content) {
          const name = file.replace(".md", "");
          parts.push(
            `<discussion name="${name}">\n${content.slice(0, 2000)}\n</discussion>`
          );
        }
      }
    } catch {
      // Ignore
    }
  }

  return `<system-context>\n${parts.join("\n\n")}\n</system-context>`;
}

function buildTaskContext(issue: Issue, comments?: string[]): string {
  const parts: string[] = [];

  const issueParts: string[] = [issue.body || "_No description provided._"];

  // Labels
  const labels = issue.labels.filter(
    (l) => l.startsWith("p:") || l.startsWith("type:")
  );
  if (labels.length > 0) {
    issueParts.push(`**Labels:** ${labels.join(", ")}`);
  }

  parts.push(
    `<issue number="${issue.number}" title="${issue.title}">\n${issueParts.join("\n\n")}\n</issue>`
  );

  // Issue comments (conversation)
  if (comments && comments.length > 0) {
    parts.push(`<issue-comments>\n${comments.join("\n")}\n</issue-comments>`);
  }

  return `<task-context>\n${parts.join("\n\n")}\n</task-context>`;
}

function buildSprintContext(
  sprintName?: string,
  position?: string,
  diffSummary?: string
): string {
  const parts: string[] = [];

  if (sprintName) {
    parts.push(`**Sprint:** ${sprintName}`);
  }
  if (position) {
    parts.push(`**Position:** Task ${position}`);
  }

  if (diffSummary) {
    parts.push(
      `<previous-changes>\nThe following changes have already been made by earlier tasks in this sprint:\n\n\`\`\`diff\n${diffSummary}\n\`\`\`\n</previous-changes>`
    );
  }

  parts.push(
    `**Important:** Build upon the changes from previous tasks. Do not revert or undo their work.`
  );

  return `<sprint-context>\n${parts.join("\n\n")}\n</sprint-context>`;
}

function buildRepoContext(projectRoot: string): string {
  const parts: string[] = [];

  // File tree (top-level + one level deep, excluding common directories)
  try {
    const tree = execSync(
      "find . -maxdepth 2 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.locus/*' -not -path '*/dist/*' -not -path '*/build/*' | head -80",
      { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (tree) {
      parts.push(`<file-tree>\n\`\`\`\n${tree}\n\`\`\`\n</file-tree>`);
    }
  } catch {
    // Ignore
  }

  // Recent git log
  try {
    const gitLog = execSync("git log --oneline -10", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (gitLog) {
      parts.push(
        `<recent-commits>\n\`\`\`\n${gitLog}\n\`\`\`\n</recent-commits>`
      );
    }
  } catch {
    // Ignore
  }

  // Current branch
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    parts.push(`**Current branch:** ${branch}`);
  } catch {
    // Ignore
  }

  return `<repository-context>\n${parts.join("\n\n")}\n</repository-context>`;
}

function buildExecutionRules(config: LocusConfig): string {
  return `<execution-rules>
1. **Commit format:** Use conventional commits: \`feat: <title> (#<issue>)\`, \`fix: ...\`, \`chore: ...\`. Every commit message MUST be multi-line: the first line is the title, then a blank line, then \`Co-Authored-By: LocusAgent <agent@locusai.team>\` as a Git trailer. Use \`git commit -m "<title>" -m "Co-Authored-By: LocusAgent <agent@locusai.team>"\` (two separate -m flags) to ensure the trailer is on its own line.
2. **Code quality:** Follow existing code style. Run linters/formatters if available.
3. **Testing:** If test files exist for modified code, update them accordingly.
4. **Update memory:** Before finishing, if you discovered any reusable lessons (architectural patterns, non-obvious constraints, user corrections), record them in the appropriate category file in \`.locus/memory/\` (architecture.md, conventions.md, decisions.md, preferences.md, debugging.md). This is mandatory — see the "Continuous Learning" section in project instructions.
5. **Do NOT:**
   - Run \`git push\` (the orchestrator handles pushing)
   - Modify files outside the scope of this issue
   - Delete or revert changes from previous sprint tasks
   - Introduce new dependencies without clear justification
6. **Base branch:** ${config.agent.baseBranch}
7. **Provider:** ${config.ai.provider} / ${config.ai.model}

When you are done, provide a brief summary of what you changed and why.
</execution-rules>`;
}

function buildPRContext(
  prNumber: number,
  diff: string,
  comments: string[]
): string {
  const parts: string[] = [
    `<pr-diff>\n\`\`\`diff\n${diff.slice(0, 10000)}\n\`\`\`\n</pr-diff>`,
  ];

  if (comments.length > 0) {
    parts.push(`<review-comments>\n${comments.join("\n")}\n</review-comments>`);
  }

  return `<pr-context number="${prNumber}">\n${parts.join("\n\n")}\n</pr-context>`;
}

function buildFeedbackInstructions(): string {
  return `<instructions>
1. Address ALL review feedback from the comments above.
2. Make targeted changes — do NOT rewrite code from scratch.
3. If a reviewer comment is unclear, make your best judgment and note your interpretation.
4. Push changes to the same branch — do NOT create a new PR.
5. If you learned any reusable lessons from this feedback (non-obvious constraints, architectural patterns), record them in the appropriate category file in \`.locus/memory/\`.
6. When done, summarize what you changed in response to each comment.
</instructions>`;
}

/**
 * Build a compact skills context listing installed skills by name + description.
 * The agent is instructed to read the full SKILL.md from disk if relevant.
 */
function buildSkillsContext(projectRoot: string): string | null {
  const skillsDir = join(projectRoot, CLAUDE_SKILLS_DIR);
  if (!existsSync(skillsDir)) return null;

  let dirs: string[];
  try {
    dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return null;
  }

  if (dirs.length === 0) return null;

  const entries: string[] = [];
  for (const dir of dirs) {
    const skillPath = join(skillsDir, dir, "SKILL.md");
    const content = readFileSafe(skillPath);
    if (!content) continue;

    // Parse YAML frontmatter for name + description
    const fm = parseFrontmatter(content);
    const name = fm.name || dir;
    const description = fm.description || "";
    entries.push(`- **${name}**: ${description}`);
  }

  if (entries.length === 0) return null;

  return `<installed-skills>
The following skills are installed in this project. If a skill is relevant to the current task, read its full instructions from \`.claude/skills/<name>/SKILL.md\` before starting work.

${entries.join("\n")}
</installed-skills>`;
}

/** Extract name and description from YAML frontmatter in a SKILL.md file. */
function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;

  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && val) result[key] = val;
  }
  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFileSafe(path: string): string | null {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}
