## Planning First

**Before writing any code** for complex or multi-step tasks, you **must** create a plan file at `.locus/plans/<task-name>.md`. Do NOT skip this step — write the plan file to disk first, then execute.

**Plan file structure:**
- **Goal**: What we're trying to achieve and why
- **Approach**: Step-by-step strategy with technical decisions
- **Affected files**: List of files to create/modify/delete
- **Acceptance criteria**: Specific, testable conditions for completion
- **Dependencies**: Required packages, APIs, or external services

**When to plan:**
- Tasks that touch 3+ files
- New features or architectural changes
- Tasks with ambiguous requirements that need decomposition
- Any task where multiple approaches exist

**When you can skip planning:**
- Single-file bug fixes with obvious root cause
- Typo corrections, comment updates, or trivial changes
- Tasks with very specific, step-by-step instructions already provided

Delete the planning `.md` files after successful execution.

## Code Quality

- **Follow existing patterns**: Run formatters and linters before finishing (check "package.json" scripts or project config)
- **Minimize changes**: Keep modifications atomic. Separate refactors from behavioral changes into different tasks
- **Never commit secrets**: No API keys, passwords, or credentials in code. Use environment variables or secret management
- **Test as you go**: If tests exist, run relevant ones. If breaking changes occur, update tests accordingly
- **Comment complex logic**: Explain *why*, not *what*. Focus on business logic and non-obvious decisions

## Parallel Execution with Subagents

Use the **Task tool** to launch subagents for parallelizing independent work. Subagents run autonomously and return results when done.

**When to use subagents:**
- **Codebase exploration**: Use `subagent_type: "Explore"` to search for files, patterns, or understand architecture across multiple locations simultaneously
- **Independent research**: Launch multiple explore agents in parallel when you need to understand different parts of the codebase at once
- **Complex multi-area changes**: When a task touches unrelated areas, use explore agents to gather context from each area in parallel before making changes

**How to use:**
- Specify `subagent_type` — use `"Explore"` for codebase research, `"general-purpose"` for multi-step autonomous tasks
- Launch multiple agents in a **single message** to run them concurrently
- Provide clear, detailed prompts so agents can work autonomously
- Do NOT duplicate work — if you delegate research to a subagent, wait for results instead of searching yourself

**When NOT to use subagents:**
- Simple, directed searches (use Glob or Grep directly)
- Reading a specific known file (use Read directly)
- Tasks that require sequential steps where each depends on the previous

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

**The quality bar:** Ask yourself — "Would a new agent working on a completely different task benefit from knowing this?" If yes, record it. If it only matters for the current task or file, skip it.

**When to update:**
- User corrects your approach, rejects a choice, or states a preference explicitly
- You discover where something lives architecturally (e.g., which package owns shared types)
- A structural or design decision would not be obvious from reading the code
- You encounter a non-obvious constraint that applies project-wide

**What to record (high-value):**
- Where things live: package ownership, shared utilities, config locations
- Architectural decisions and their rationale ("we use X not Y because Z")
- Explicit user preference overrides — when the user corrects or rejects an approach
- Project-wide conventions that aren't visible from a single file

**What NOT to record (low-value):**
- One-time fixes or workarounds specific to a single file or function
- Implementation details that are obvious from reading the code
- Startup sequences, signal handlers, or local patterns — unless they represent a project-wide rule
- Anything the next agent could discover in 30 seconds by reading the relevant file

**Good examples:**
- `[Architecture]`: Shared types for all packages live in `@locusai/shared` — never redefine them locally in CLI or API packages.
- `[User Preferences]`: User prefers not to track low-level interrupt/signal handling patterns in learnings — focus on architectural and decision-level entries.
- `[Packages]`: Validation uses Zod throughout — do not introduce a second validation library.

**Bad examples (do not write these):**
- `[Patterns]`: `run.ts` must call `registerShutdownHandlers()` at startup. ← too local, obvious from the file.
- `[Debugging]`: Fixed a regex bug in `image-detect.ts`. ← one-time fix, irrelevant to future tasks.

**Format (append-only, never delete):**

"""
- **[Category]**: Concise description (1-2 lines max). *Rationale if non-obvious.*
"""

**Categories:** Architecture, Packages, User Preferences, Conventions, Debugging

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
