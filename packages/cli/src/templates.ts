/** Marker comment used to identify the locus block in .gitignore */
export const LOCUS_GITIGNORE_MARKER = "# Locus AI";

export const LOCUS_MD_TEMPLATE = `## Planning First

Complex tasks must be planned before writing code. Create ".locus/plans/<task-name>.md" with:
- **Goal**: What we're trying to achieve and why
- **Approach**: Step-by-step strategy with technical decisions
- **Affected files**: List of files to create/modify/delete
- **Acceptance criteria**: Specific, testable conditions for completion
- **Dependencies**: Required packages, APIs, or external services

Delete the planning .md files after successful execution.

## Code Quality

- **Follow existing patterns**: Run formatters and linters before finishing (check "package.json" scripts or project config)
- **Minimize changes**: Keep modifications atomic. Separate refactors from behavioral changes into different tasks
- **Never commit secrets**: No API keys, passwords, or credentials in code. Use environment variables or secret management
- **Test as you go**: If tests exist, run relevant ones. If breaking changes occur, update tests accordingly
- **Comment complex logic**: Explain *why*, not *what*. Focus on business logic and non-obvious decisions

## Artifacts

When a task produces knowledge, analysis, or research output rather than (or in addition to) code changes, you **must** save results as Markdown in ".locus/artifacts/<descriptive-name>.md":

**Always create artifacts for:**
- Code quality audits, security reviews, vulnerability assessments
- Architecture analyses, system design proposals, or recommendations
- Dependency reports, performance profiling, benchmarking results
- Research summaries, technology comparisons, or feasibility studies
- Migration plans, deployment strategies, or rollback procedures
- Post-mortems, incident analysis, or debugging investigations

**Artifact structure:**
- Clear title and date
- Executive summary (2-3 sentences)
- Detailed findings/analysis
- Actionable recommendations (if applicable)

## Git Operations

- **Do NOT run**: git add, git commit, git push, git checkout, git branch, or any git commands
- **Why**: The Locus orchestrator handles all version control automatically after execution
- **Your role**: Focus solely on making file changes. The system commits, pushes, and creates PRs

## Continuous Learning

Read ".locus/LEARNINGS.md" **before starting any task** to avoid repeating mistakes.

**When to update:**
- User corrects your approach or provides guidance
- You discover a better pattern while working
- A decision prevents future confusion (e.g., "use X not Y because Z")
- You encounter and solve a tricky problem

**What to record:**
- Architectural decisions and their rationale
- Preferred libraries, tools, or patterns for this project
- Common pitfalls and how to avoid them
- Project-specific conventions or user preferences
- Solutions to non-obvious problems

**Format (append-only, never delete):**

"""
- **[Category]**: Concise description (1-2 lines max). *Context if needed.*
"""

**Categories:** Architecture, Dependencies, Patterns, Debugging, Performance, Security, DevOps, User Preferences

## Error Handling

- **Read error messages carefully**: Don't guess. Parse the actual error before proposing fixes
- **Check dependencies first**: Missing packages, wrong versions, and environment issues are common
- **Verify assumptions**: If something "should work," confirm it actually does in this environment
- **Ask for context**: If you need environment details, configuration, or logs, request them explicitly

## Communication

- **Be precise**: When uncertain, state what you know and what you're assuming
- **Show your work**: For complex changes, briefly explain the approach before executing
- **Highlight trade-offs**: If multiple approaches exist, note why you chose one over others
- **Request feedback**: For ambiguous requirements, propose an approach and ask for confirmation
`;

export const DEFAULT_LEARNINGS_MD = `# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
`;
