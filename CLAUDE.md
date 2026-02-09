## Planning First

Every task must be planned before writing code. Create \`.locus/plans/<task-name>.md\` with: goal, approach, affected files, and acceptance criteria. Update the plan if the approach changes. Mark complete when done.

## Code

- Follow the existing formatter, linter, and code style. Run them before finishing.
- Keep changes minimal and atomic. Separate refactors from behavioral changes.
- No new dependencies without explicit approval.
- Never put raw secrets or credentials in the codebase.

## Avoiding Hallucinated / Slop Code

- Ask before assuming. If requirements are ambiguous, incomplete, or could be interpreted multiple ways, stop and ask clarifying questions rather than guessing.
- Never invent APIs, libraries, functions, or config options.** Only use APIs and methods you can verify exist in the project's dependencies or documentation. If unsure whether something exists, ask or look it up first.
- No placeholder or stub logic unless explicitly requested. Every piece of code you write should be functional and intentional. Do not leave `// TODO` blocks, fake return values, or mock implementations without flagging them clearly.
- Do not generate boilerplate "just in case." Only write code that is directly required by the task. No speculative utilities, unused helpers, or premature abstractions.
- If you're uncertain, say so. State your confidence level. "I believe this is correct but haven't verified X" is always better than silent guessing.
- Read before writing Before modifying a file, read the relevant existing code to match conventions, understand context, and avoid duplicating logic that already exists.