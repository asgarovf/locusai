# Locus Product Roadmap

This document outlines the steps to take Locus from an MVP to a polished, professional product.

## Phase 1: DX & CLI Refinement (Current)
- [x] Unified CLI: `locus init` and `locus dev`.
- [ ] Global CLI installation: Allow users to run `npm install -g @locus/cli`.
- [ ] Port Conflict Management: Gracefully handle if 3080/3081 are taken.
- [ ] Auto-opening Browser: Automatically open the dashboard on `locus dev`.

## Phase 2: Documentation & Polish
- [ ] **Locus Book**: A GitBook or Nextra-based documentation site.
- [ ] **Onboarding Flow**: A "Welcome" tour in the dashboard for first-time users.
- [ ] **Tool Visibility**: UI section to see and test available MCP tools.

## Phase 3: Collaboration & Sync (Monetization)
- [ ] **Locus Cloud (Paid)**: Opt-in cloud sync for SQLite via Turso/libSQL.
- [ ] **Conflict Resolver**: UI for resolving binary conflicts in SQLite (if not using Cloud Sync).
- [ ] **Premium Agent Hosting**: Higher compute for long-running engineering tasks.

## Phase 4: Distribution
- [ ] **NPM Launch**: Publish `@locus/cli`, `@locus/server`, `@locus/web`.
- [ ] **VSCode Extension**: A thin wrapper that runs `locus dev` in the background and provides a sidebar.

---

## Marketing Strategy
- **Keywords**: Local-first, Agentic Workspaces, AI-Native PM, No-Cloud.
- **Hook**: "Your project management should be as close to your code as your compiler."
