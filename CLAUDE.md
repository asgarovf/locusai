## Planning First

Every task must be planned before writing code. Create \`.locus/plans/<task-name>.md\` with: goal, approach, affected files, and acceptance criteria. Update the plan if the approach changes. Mark complete when done.

## Code

- Follow the existing formatter, linter, and code style. Run them before finishing.
- Keep changes minimal and atomic. Separate refactors from behavioral changes.
- No new dependencies without explicit approval.
- Never put raw secrets or credentials in the codebase.

## Testing

- Every behavioral change needs a test. Bug fixes need a regression test.
- Run the relevant test suite before marking work complete.
- Don't modify tests just to make them pass — understand why they fail.

## Communication

- If the plan needs to change, update it and explain why before continuing.