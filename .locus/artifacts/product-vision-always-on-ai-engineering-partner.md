# Locus Product Vision: Always-On AI Engineering Partner

**Date:** 2026-02-22
**Type:** Product Strategy & Vision
**Summary:** Locus is repositioning from a CLI wrapper for AI coding agents to an always-on, self-hosted AI engineering partner managed via Telegram. The core value is giving solo founders/CTOs the experience of having a continuous engineering team — one that ships code, maintains code health, proposes next steps, and keeps products evolving even when the founder steps away.

---

## Product Identity

**What Locus is:** An always-on, self-hosted AI engineering partner you manage from Telegram.

**What Locus is NOT:** A CLI wrapper for Claude Code or Codex. The local `locus exec` command is commoditized — Claude Code and competitors do this natively.

**Target user:** Solo founders and CTOs who want to act as engineering managers overseeing an AI development team, not as hands-on developers sitting alongside an AI assistant.

**Core emotional value:** Eliminating the "single point of failure" feeling. The founder should wake up, open Telegram, and see that their product kept evolving overnight.

---

## Strategic Context

### What's Commoditized (Not Our Moat)
- CLI wrapping of Claude/Codex
- Session management and REPL
- CLAUDE.md-style project context injection
- Git automation
- Code review

### What's Unique (Our Moat)
- **Discussion → execution pipeline:** Natural conversation → structured insights → sprint planning → context-enriched execution. No competitor does this.
- **Async remote control via Telegram:** Dispatch, approve, and manage AI dev tasks from your phone. Claude Code and Codex require you to be at a keyboard.
- **Proactive initiative:** Every competitor is reactive (waits for human input). Locus will be the first tool that proactively proposes, analyzes, and drives continuous development.

### Market Gap
- Developer trust in AI code dropped from 40% to 29% YoY
- 65% cite missing context as the #1 problem with AI coding tools
- Only 17% say agents have improved team collaboration
- No tool in the market provides proactive, autonomous engineering partnership

---

## Core Capabilities (Build Sequence)

### Phase 1: Autonomous Code Health Maintenance
- Nightly cron-based scans of the codebase
- Auto-fix low-risk issues: flaky tests, outdated dependencies, linting, TODO cleanup
- Each job runs independently with its own Telegram notification
- Low-risk fixes can be auto-executed; results reported via Telegram

### Phase 2: Activity Feed (Natural Output of Phase 1)
- Every autonomous action generates a Telegram message
- Creates the "team Slack channel" experience — the founder sees continuous activity
- Shows both completed work and ongoing analysis

### Phase 3: Proactive Next-Step Proposals
- After merged PRs or nightly analysis, the agent proposes what to build next
- Leverages context from Phase 1 scans and existing plans/roadmap
- Telegram inline buttons: `[Start] [Skip] [Details]`

### Phase 4: Fire-and-Forget Task Execution
- Builds on existing Telegram → plan → sprint → PR flow
- Text a task from your phone, walk away, come back to a completed PR
- Auto-merge on Telegram approval for low-risk changes

---

## Architecture Decisions

### Deployment Model
- **Self-hosted, always-on server process** (home PC or cloud instance)
- Bring-your-own-infrastructure: user pays for compute + AI API credits, no Locus SaaS fee
- One agent instance per project (multiple instances for multiple repos)

### Scheduling
- **Cron-based for MVP** (e.g., nightly runs)
- Predictable, debuggable, avoids token waste from poorly designed event-driven systems
- Evolve to event-driven later based on learned usage patterns

### Tiered Autonomy Model
- **Auto-execute (low risk):** Flaky test fixes, dependency updates, linting, minor refactors, CSS changes, utility functions
- **Require approval (high risk):** New features, architecture changes, database migrations, auth/payment system changes, public API modifications
- **Risk heuristics:** Change type (feature vs. fix vs. refactor), system area affected, scope (files/lines changed)

### Feature Activation
- Whitelist-based configuration: users choose which autonomous capabilities to enable
- All features enabled by default
- Setup wizard for fine-tuning on first configuration

### Job Architecture
- Each autonomous capability runs as an independent job
- Independent Telegram notifications per job
- Individually configurable schedules and enable/disable toggles
- Failed jobs can be retried independently

### Suggestion Lifecycle & Deduplication
- States: `new → notified → acted on / skipped / expired`
- Skipped items are permanently dismissed (never resurface)
- Unresponded items auto-expire after TTL (~24 hours)
- State persisted in cloud API database (not local to agent server)
- Ensures persistence across server restarts and device changes

### Telegram Interaction Model
- Inline buttons for all approval flows: `[Fix] [Skip] [Details]`
- Lightweight, mobile-native interaction
- No need to type responses for routine decisions

### Cloud API Role
- Evolves from web app backend to **central coordination layer**
- Stores suggestion state, approval history, agent activity logs
- Enables cross-instance aggregation if managing multiple projects

---

## Key Risks & Concerns

1. **Cost of always-on operation:** Even cron-based, nightly AI analysis burns API credits. Need to optimize prompts and cache analysis results where possible.
2. **Feature commoditization:** 60-70% of current features are being built natively into Claude Code and competitors. The always-on autonomous partner is the escape velocity — it must ship before competitors move upstream.
3. **No significant user base yet:** Product decisions are based on founder intuition and market analysis, not user feedback data. The founder's own usage patterns are the best signal available.
4. **Trust calibration:** Getting the autonomy tiers right is critical. Too aggressive = rogue agent anxiety. Too conservative = just another approval queue.

---

## Success Criteria

The product is working when the founder can:
1. Go to sleep and wake up to Telegram messages showing overnight activity
2. See completed PRs waiting for one-tap approval
3. Receive proactive suggestions for what to build next
4. Approve or dismiss proposals without opening a laptop
5. Feel that their product is evolving continuously, not just when they're actively working on it
