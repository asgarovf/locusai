# Product Impact Evaluation

An honest assessment of where Locus stands, what impact it creates, and what would make that impact undeniable.

## What Locus Does Today

Locus is an AI-native project management platform that separates **planning** (cloud) from **execution** (local). The core workflow:

1. **Plan** — Define sprints manually or via multi-agent AI planning meetings
2. **Dispatch** — Tasks are distributed to local AI agents with server-side locking
3. **Execute** — Agents claim tasks, write code on isolated branches, run tests, commit, push
4. **Review** — PRs are created, AI code review catches issues before human review

Key properties: source code never leaves your machine, supports Claude and Codex, open source, self-hostable, controllable via Telegram.

## Honest Challenges

### 1. Orchestration Layer Risk

Locus does not write code — Claude and Codex do. The core value is orchestration: dispatching tasks, managing branches, coordinating agents. This layer is vulnerable to absorption by AI providers (Anthropic's Agent SDK, OpenAI's Codex runtime) or by existing PM tools (Linear, GitHub Projects) adding native AI execution.

### 2. Crowded Market

Devin, Factory, Sweep, Cursor, Windsurf, and others occupy the "AI writes your code" market. Each has significant funding and is iterating fast. Differentiation must be sharp and defensible.

### 3. Broad Scope, Early Stage

The product spans: PM tool, agent runtime, code reviewer, discussion platform, Telegram bot, VSCode extension. Breadth without depth at alpha stage makes it hard to be distinctively excellent at any single thing.

### 4. No Impact Data

There are no metrics on developer time saved, code quality improvements, sprint velocity changes, or user engagement. Without data, the impact claim is aspirational rather than demonstrated.

## Genuine Differentiators

### 1. Local Execution

Most competitors send code to the cloud. "Your code never leaves your machine" is a real security story for regulated industries, enterprises, and security-conscious teams. This is a non-trivial advantage.

### 2. Plan-to-PR Pipeline

Most AI coding tools are reactive. The workflow `locus plan "goal" → approve → locus run → PR` is a differentiated pipeline. The gap between "I have a product idea" and "I have PRs to review" is real and mostly unsolved.

### 3. Open Source + Self-Hosting

In a market where every tool wants to be SaaS, offering full self-hosting with remote Telegram control is a meaningful trust and positioning advantage for developer audiences.

### 4. Cognitive Context System

The `.locus/LOCUS.md` instructions, semantic codebase index, workspace documents, sprint context, and `LEARNINGS.md` — this accumulated context makes agents effective over time, not just one-shot code generators. This is a compounding advantage.

## What Would Make Impact Visible

### Pick One Wedge

The strongest candidate is the **plan-to-PR pipeline**. Make `locus plan → approve → locus run → PR` flawless for a specific type of project (e.g., Next.js apps, NestJS backends). A narrow, excellent experience beats a broad, mediocre one.

### Measure and Surface Impact

Track and display in the dashboard:
- Tasks completed per sprint (agent vs human)
- Time from plan approval to merged PR
- Code review pass rate (first-pass approval %)
- Lines of code shipped by agents
- Sprint velocity over time

If the product creates value, prove it with numbers.

### Build for Teams, Not Solo Devs

Solo developers can use Claude Code or Cursor directly. Locus's value should be **coordination**: multiple people managing a backlog, agents working through sprints while humans review, visibility into what got done. The multiplayer angle is where PM tools win.

### Ship a Case Study

Use Locus to build Locus. Document the sprint, agent output, review process, and merge. One concrete example of "this sprint of 8 tasks was planned and executed by agents in an afternoon" is worth more than any feature list.

## Summary

The product has genuine technical differentiation (local execution, cognitive context, plan-to-PR pipeline) but the impact is hard to see because it's spread across too many surfaces and measured nowhere. The path forward is: narrow the focus, measure the outcomes, and demonstrate the value with real data rather than feature lists.
