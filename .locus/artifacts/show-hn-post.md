# Show HN Post Draft

**Date:** 2026-02-20

## Post Details

### Title (max 80 chars)
```
Show HN: Locus – Open-source AI project management where agents run on your machine
```

### URL
```
https://github.com/asgarovf/locusai
```

### Text

```
Hi HN,

I built Locus, an open-source (MIT) project management platform designed for engineering teams that want to use AI coding agents without sending their source code to third-party servers.

The core idea: plan sprints and manage tasks in a cloud dashboard, but all code execution happens locally on your infrastructure. Your source code never leaves your machine.

How it works:

- `locus plan` — AI generates a sprint plan by analyzing your codebase. It uses multi-agent roles (Tech Lead, Architect, Sprint Organizer) to break down directives into structured tasks with complexity estimates and risk assessments. You can reject and iterate on plans before approving.

- `locus run` — An autonomous agent picks up tasks from the sprint, executes them sequentially on a single branch, auto-commits after each task, and opens a PR when the sprint is done. Supports both Claude and Codex as backends.

- `locus review` — AI-powered code review that understands your full codebase, not just diffs. Detects bugs, security issues, and performance problems. Posts review comments directly to GitHub PRs.

- `locus discuss` — Have architectural discussions with AI that has full project context. Insights and decisions are automatically extracted and saved.

- Telegram bot — Manage your agent remotely from your phone. Plan sprints, approve tasks, trigger runs, all from Telegram.

- VSCode extension — Chat with AI in your editor with full repo context.

The whole system is free, self-hostable, and works with your existing GitHub workflow. There's a one-command installation script for Ubuntu/Debian/macOS that sets up everything including the Telegram bot as a system service.

Tech stack: TypeScript monorepo with NestJS API, Next.js dashboard, and a Bun-bundled CLI. The CLI uses worker threads to run agents and streams status updates in real-time.

I'm a solo developer building this because I was frustrated with the disconnect between planning tools and actual code execution. Every AI coding tool I tried either required sending my code to external APIs or had no concept of project management — Locus tries to bridge that gap.

Would love feedback on the approach and any features you'd want to see.

GitHub: https://github.com/asgarovf/locusai
Docs: https://docs.locusai.dev
Website: https://locusai.dev
```

---

## Alternative Shorter Titles (pick your favorite)

1. `Show HN: Locus – AI agents that plan and ship code without leaving your machine`
2. `Show HN: Locus – Open-source AI sprint planning and autonomous code execution`
3. `Show HN: Locus – Plan in the cloud, execute locally with AI coding agents`
4. `Show HN: Locus – AI project management where your code never leaves your infra`

## Notes

- The title emphasizes both the open-source nature and the local execution differentiator — the two things HN cares about most.
- The text follows HN conventions: starts with what it is, explains the architecture, lists concrete features with CLI examples, mentions the tech stack (HN loves this), includes personal motivation, and ends with a call for feedback.
- URL points to GitHub rather than the marketing site — HN tends to prefer repos over landing pages for developer tools.
- Kept under ~300 words for the text body which is the sweet spot for ShowHN engagement.
