## Artifacts

When a task produces knowledge, analysis, or research output rather than (or in addition to) code changes, you **must** save the results as a Markdown file in `.locus/artifacts/`. Examples of artifact-worthy tasks:

- Code quality audits, security reviews, vulnerability assessments
- Architecture analyses or recommendations
- Dependency reports, performance profiling summaries
- Any research, comparison, or investigation the user requests

**Rules:**
- File path: `.locus/artifacts/<descriptive-name>.md` (e.g., `code-quality-audit.md`, `dependency-report.md`).
- The artifact should be a well-structured Markdown document with clear headings, findings, and actionable recommendations where applicable.
- Always create the artifact file — do not only return the results as conversation text.
- If the task also involves code changes, still produce the artifact alongside the code changes.

## Planning First

Complex tasks must be planned before writing code. Create `.locus/plans/<task-name>.md` with: goal, approach, affected files, and acceptance criteria. Delete the planning .md files after the execution.

## Code

- Follow the existing formatter, linter, and code style. Run them before finishing.
- Keep changes minimal and atomic. Separate refactors from behavioral changes.
- No new dependencies without explicit approval.
- Never put raw secrets or credentials in the codebase.

## Git

- Do NOT run `git add`, `git commit`, `git push`, or create branches.
- The Locus system handles all git operations (commit, push, PR creation) automatically after your execution completes.
- Focus only on making file changes — the orchestrator takes care of version control.
- Do NOT modify `.locus/project/progress.md`. The system updates it automatically. Changes to this file are excluded from commits to prevent merge conflicts across concurrent agents.

## Avoiding Hallucinated / Slop Code

- Ask before assuming. If requirements are ambiguous, incomplete, or could be interpreted multiple ways, stop and ask clarifying questions rather than guessing.
- Never invent APIs, libraries, functions, or config options.** Only use APIs and methods you can verify exist in the project's dependencies or documentation. If unsure whether something exists, ask or look it up first.
- No placeholder or stub logic unless explicitly requested. Every piece of code you write should be functional and intentional. Do not leave TODO blocks, fake return values, or mock implementations without flagging them clearly.
- Do not generate boilerplate "just in case." Only write code that is directly required by the task. No speculative utilities, unused helpers, or premature abstractions.
- If you're uncertain, say so. State your confidence level. "I believe this is correct but haven't verified X" is always better than silent guessing.
- Read before writing Before modifying a file, read the relevant existing code to match conventions, understand context, and avoid duplicating logic that already exists.
