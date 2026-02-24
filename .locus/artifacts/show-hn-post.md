# Show HN Post Draft

**Date:** 2026-02-24

## Post Details

### Title (max 80 chars)
```
Show HN: Locus – Open-source CLI that turns GitHub issues into shipped code
```

### URL
```
https://github.com/asgarovf/locusai
```

### Text

```
Hi HN,

I built Locus, an open-source (MIT) CLI tool that turns GitHub issues into shipped code using AI agents. No cloud, no accounts, no infrastructure — everything runs locally and uses GitHub as the backend.

The core idea: your GitHub issues and milestones ARE your project management system. Locus reads them, plans sprints, and dispatches AI agents to execute tasks autonomously.

How it works:

- `locus plan` — AI analyzes your GitHub issues and generates a sprint plan. It uses multi-agent roles (Tech Lead, Architect, Sprint Organizer) to break directives into structured tasks with complexity estimates. You review and approve before anything runs.

- `locus run` — Autonomous agents pick up sprint tasks, execute them in parallel worktrees, auto-commit, and open PRs. Supports both Claude Code and OpenAI Codex as backends.

- `locus review` — AI-powered code review that understands your full codebase, not just diffs. Posts findings directly to GitHub PRs.

- `locus exec` — Interactive REPL for ad-hoc AI tasks with full project context.

- `locus discuss` — Architectural discussions with AI that persist decisions for future context.

The entire system is GitHub-native. Issues are tasks. Milestones are sprints. Labels track execution state. PRs are deliverables. No database, no API server, no sign-up.

Prerequisites are just the GitHub CLI (`gh`) and an AI agent CLI (Claude Code or Codex). Install with `npm install -g @locusai/cli`, run `locus init`, and you're shipping.

Tech: TypeScript CLI built with Commander.js and Bun. Uses `gh` for all GitHub operations, git worktrees for parallel execution, and streams real-time progress to the terminal.

I'm a solo developer who was frustrated with the disconnect between planning tools and code execution. Every AI tool I tried either required cloud infrastructure or had no concept of project management — Locus bridges that gap with zero additional services.

Would love feedback on the approach.

GitHub: https://github.com/asgarovf/locusai
Docs: https://locusai.dev/docs
```

---

## Alternative Shorter Titles (pick your favorite)

1. `Show HN: Locus – GitHub-native CLI that plans sprints and ships code with AI agents`
2. `Show HN: Locus – From GitHub issue to PR, autonomously`
3. `Show HN: Locus – AI sprint execution that uses GitHub as its only backend`
4. `Show HN: Locus – Open-source CLI where issues become PRs via AI agents`

## Notes

- Title emphasizes the open-source nature and the zero-infrastructure differentiator.
- Text follows HN conventions: what it is, architecture, concrete features with CLI examples, tech stack, personal motivation, call for feedback.
- URL points to GitHub rather than the marketing site — HN prefers repos for developer tools.
- Kept under ~300 words for the sweet spot of ShowHN engagement.
- No cloud dashboard, no Telegram, no self-hosting mentioned — those are v2 concepts that no longer apply.
