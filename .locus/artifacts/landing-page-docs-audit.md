# Landing Page & Documentation Audit

**Date:** 2026-02-19
**Scope:** `apps/www/` (landing page), `docs/` (documentation), `README.md`

## Executive Summary

The landing page is well-designed with strong messaging and clear product positioning. The documentation is thorough and well-written. However, the audit uncovered **critical accuracy issues**: features that don't exist in the codebase are prominently marketed (parallel multi-agent execution with `--agents`, `--auto-push`, `locus agents`, `locus login`, `locus dash`), there are content inconsistencies across pages, and several implemented features lack documentation entirely. Addressing these issues is essential before any marketing launch.

---

## Severity Definitions

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | Feature advertised that doesn't exist in source code — damages credibility if users try it |
| **HIGH** | Inconsistency or missing content that confuses users or blocks workflows |
| **MEDIUM** | Accuracy issue, misplaced content, or gap that affects quality |
| **LOW** | Minor polish, SEO, or improvement opportunity |

---

## CRITICAL Issues

### C1. `--agents` flag and parallel execution do not exist

**Locations affected:**
- `apps/www/src/components/landing/ProductShowcase.tsx` — AI Agent description says "Run multiple agents in parallel with --agents"
- `apps/www/src/app/cli/page.tsx:34-38` — CLI reference page lists `--agents <N>` as a flag for `locus run`
- `apps/www/src/components/landing/FeatureGrid.tsx` — "Multi-Agent Execution" feature card says "Run multiple agents in parallel across tasks"
- `README.md:75-77` — shows `npx @locusai/cli run --agents 3`
- `docs/concepts/agents.md` — entire "Parallel Execution" section
- `docs/cli/run.md` — `--agents <N>` flag documented with max 5

**Source code reality:**
- `packages/cli/src/commands/run.ts:9-22` — `parseArgs` options contain **no** `agents` flag. Only flags: `api-key`, `workspace`, `sprint`, `model`, `provider`, `reasoning-effort`, `skip-planning`, `api-url`, `dir`
- No pool, no worker management, no parallel branch handling exists in the SDK orchestrator
- The orchestrator coordinates task execution with a **single agent** only

**Impact:** This is the most prominent feature shown in marketing — users trying `locus run --agents 3` will get an error. The CLI Reference page, FeatureGrid, and ProductShowcase all market a non-existent capability.

**Recommendation:** Either implement the feature or update all marketing and docs to reflect single-agent sequential execution (which IS implemented and works well). The current single-agent workflow is a perfectly valid product — don't oversell.

---

### C2. `--auto-push` flag does not exist in CLI source

**Locations affected:**
- `apps/www/src/app/cli/page.tsx:41` — listed as a flag for `locus run`
- `apps/www/src/app/products/agents/page.tsx` — agents product page describes auto-push behavior

**Source code reality:**
- No `auto-push` option in `packages/cli/src/commands/run.ts` parseArgs
- No `auto-push` reference anywhere in `packages/cli/src/` or `packages/sdk/src/`

**Impact:** Users referencing the CLI page will try a flag that doesn't exist.

**Recommendation:** Remove `--auto-push` from the CLI reference page, or implement the feature.

---

### C3. `locus agents` command does not exist

**Locations affected:**
- `docs/cli/agents.md` — full page documenting `locus agents list` and `locus agents clean`
- `docs/SUMMARY.md` — listed in table of contents

**Source code reality:**
- No `agentsCommand` in `packages/cli/src/commands/`
- No `"agents"` case in `cli.ts` command dispatch
- No worktree management (`".locus-worktrees/"`) in codebase

**Recommendation:** Remove `docs/cli/agents.md` from docs and SUMMARY.md, or clearly mark as "Coming Soon."

---

### C4. `locus login` and `locus dash` shown in Product Showcase don't exist

**Location:** `apps/www/src/components/landing/ProductShowcase.tsx:182-195` — Cloud Dashboard section

**Source code reality:**
- No `loginCommand` or `dashCommand` in CLI source
- No `"login"` or `"dash"` case in `cli.ts`

**Recommendation:** Replace with commands that actually exist (e.g., `locus config setup` and a link to the dashboard URL).

---

### C5. "Generate technical mindmaps" claim — feature doesn't exist

**Location:** `apps/www/src/components/landing/ProductShowcase.tsx:67` — Sprint Planning description

**Source code reality:**
- No mindmap generation in `packages/sdk/src/planning/`
- The word "mindmap" only appears in marketing copy, not in implementation

**Recommendation:** Remove "Generate technical mindmaps" from the description.

---

## HIGH Issues

### H1. Conflicting agent execution descriptions across pages

**Products/Agents page** (`apps/www/src/app/products/agents/page.tsx`):
> "An autonomous AI agent that claims tasks, writes code, runs tests, and creates pull requests — all on a single branch with sequential execution."

**ProductShowcase** (`apps/www/src/components/landing/ProductShowcase.tsx`):
> "Run multiple agents in parallel with --agents to execute tasks concurrently across separate branches, or sequentially on a single branch"

These two pages directly contradict each other. The agents page correctly describes sequential single-agent execution, while the showcase markets parallel multi-agent.

**Recommendation:** Standardize all messaging to reflect the actual single-agent sequential model.

---

### H2. Node.js version inconsistency

| Location | Claims |
|----------|--------|
| Pricing FAQ (`/pricing`) | "Node.js 18+" |
| Self-hosting page (`/products/self-hosting`) | "Node.js 22+" |
| `docs/self-hosting/overview.md` | System requirements table |

**Recommendation:** Standardize. If the installer installs 22+, say "Node.js 18+ (installer provides 22+)" or just "Node.js 22+."

---

### H3. Desktop "Get Started" button goes to wrong URL

- **Desktop Navbar** "Get Started" → `https://app.locusai.dev` (root)
- **Mobile Navbar** "Get Started" → `https://app.locusai.dev/register`
- **All page CTAs** → `https://app.locusai.dev/register`

**Recommendation:** Desktop navbar should also link to `/register`.

---

### H4. "Docs" duplicated in navigation

Desktop nav has both:
- A standalone "Docs" link → `https://docs.locusai.dev`
- "Documentation" inside Resources dropdown → `https://docs.locusai.dev`

**Recommendation:** Remove one. Keep either the top-level link or the dropdown entry, not both.

---

### H5. "Semantic indexing" claim may be misleading

**Location:** `apps/www/src/components/landing/FeatureGrid.tsx` — "Codebase Intelligence" card says "Semantic indexing gives agents deep understanding"

**Source code reality:**
- No vector embeddings, no semantic search, no embedding models found in `packages/`
- `locus index` uses AI to summarize directory structure (text summarization, not semantic/vector indexing)

**Recommendation:** Change "Semantic indexing" to "AI-powered codebase indexing" or "Codebase summarization."

---

### H6. `locus discuss` command — implemented but completely undocumented

**Source:** `packages/cli/src/commands/discuss.ts` — fully implemented with subcommands: `--list`, `--show <id>`, `--archive <id>`, `--delete <id>`, registered in `cli.ts`
**Docs:** Only briefly mentioned in one tab on `docs/introduction.md`, no dedicated page, not in CLI overview table, not in SUMMARY.md

**Recommendation:** Create `docs/cli/discuss.md`, add to SUMMARY.md and CLI overview.

---

### H7. `locus upgrade` command — implemented but undocumented in docs

**Source:** `packages/cli/src/commands/upgrade.ts` — fully implemented
**Docs:** Listed in `README.md` CLI table but has no dedicated docs page, not in `docs/cli/overview.md`

**Recommendation:** Add to CLI overview and optionally create a brief docs page.

---

### H8. Broken internal link in docs

**Location:** `docs/cli/run.md` — link `[task tiers](../concepts/sprints.md)` references a concept that doesn't exist in `sprints.md`. "Task tiers" as a concept doesn't appear anywhere.

**Recommendation:** Remove the link or create the referenced section.

---

### H9. `docs/cli/json-stream.md` — exists but hidden

This is an important developer reference for the NDJSON streaming protocol, but:
- Not listed in `docs/SUMMARY.md`
- Not linked from `docs/cli/overview.md`
- Only discoverable via `docs/cli/exec.md` mention

**Recommendation:** Add to SUMMARY.md under CLI section and link from CLI overview.

---

### H10. Missing `--agents` flag from Agents product page

The agents product page (`apps/www/src/app/products/agents/page.tsx`) lists flags: `--provider`, `--sprint`, `--model`, `--skip-planning`, `--dir` — but does NOT include `--agents <N>`. This is inconsistent with the CLI reference page which does list it. While `--agents` is a CRITICAL issue (it doesn't exist), the cross-page inconsistency is a separate concern.

**Recommendation:** Once the decision is made on C1, ensure all pages show the same set of flags.

---

## MEDIUM Issues

### M1. Inaccurate AI provider references ("Codex")

**Location:** `apps/www/src/app/integrations/page.tsx:38-46`
- References "OpenAI Codex" which was a deprecated product (discontinued ~2022)
- The CLI help shows actual model names: `gpt-5.3-codex, gpt-5-codex-mini` — these are custom model identifiers

**Recommendation:** Clarify what "codex" refers to. If these are specific OpenAI models, describe them as "OpenAI models" with the actual model names rather than the deprecated "Codex" brand.

---

### M2. GitLab and Bitbucket mentioned in legal pages but nowhere else

- Privacy Policy (section 5) mentions GitLab and Bitbucket as third-party git providers
- Terms of Service (section 7) also mentions them
- No marketing page, integration card, or docs page references them

**Recommendation:** Either remove from legal docs or add integration documentation if support exists.

---

### M3. "Claude CLI" terminology — should be "Claude Code"

**Location:** `docs/getting-started/installation.md`
- Calls it "Claude CLI" and links to `https://docs.anthropic.com/en/docs/claude-cli`
- The product is now "Claude Code", package is `@anthropic-ai/claude-code`

**Recommendation:** Update to "Claude Code" with correct documentation link.

---

### M4. Planning process description inconsistency

| Location | Description |
|----------|-------------|
| `docs/introduction.md` | Implies single-pass unified team |
| `docs/concepts/sprints.md` | Three sequential phases (Tech Lead → Architect → Sprint Organizer) |
| `docs/cli/plan.md` | Three sequential phases |
| Landing page ProductShowcase | "collaborate to break down epics" |

**Recommendation:** Standardize the description across all locations. The sequential phase description is most accurate per source code.

---

### M5. Outdated nvm version pin in self-hosting docs

**Locations:** `docs/self-hosting/linux-setup.md`, `docs/self-hosting/macos-setup.md`
- Both pin to `nvm v0.39.0` which is outdated (current is v0.40+)

**Recommendation:** Update version or use latest-version URL pattern.

---

### M6. Internal documents in public docs directory

These files are internal planning/ops artifacts but exist in the public `docs/` directory:

| File | Issue |
|------|-------|
| `docs/concepts/swagger-docs-access.md` | Ops runbook listed under "Core Concepts" in SUMMARY.md |
| `docs/api/openapi-deferred-endpoints.md` | Sprint tracking artifact in public API docs section |
| `docs/architecture/vscode-extension.md` | DRAFT planning doc (not in SUMMARY.md) |
| `docs/design/vscode-chat-ui-spec.md` | DRAFT design doc (not in SUMMARY.md) |
| `docs/product/vscode-parity-matrix.md` | DRAFT parity matrix (not in SUMMARY.md) |

**Recommendation:** Move internal documents to `.locus/artifacts/` or a separate `docs/internal/` section. Remove `swagger-docs-access.md` from the "Core Concepts" section in SUMMARY.md.

---

### M7. Stale content in `docs/architecture/vscode-extension.md`

- "Top Unknowns" item #1 says `--json-stream` mode "does not exist yet" — but it's been implemented
- References `packages/vscode-extension/` but actual path is `packages/vscode/`
- Sprint plan link `../../.locus/plans/sprint-vscode-chat-v1.md` is broken (file doesn't exist)

**Recommendation:** Update if keeping the document, or move to artifacts since it's a planning doc.

---

### M8. `.locus/discussions/` directory not shown in initialization docs

`locus init` creates this directory and adds it to `.gitignore`, but `docs/getting-started/initialization.md` doesn't show it in the directory tree.

**Recommendation:** Add to the directory tree listing.

---

### M9. Telegram commands — potentially broken example

`docs/telegram/commands.md` shows `/git gh pr create "title" "body"` — but `gh pr create` doesn't accept positional title/body arguments. The correct syntax is `gh pr create --title "title" --body "body"`.

**Recommendation:** Fix the command example.

---

### M10. Unused image assets

`/public/tools/cursor.png`, `vscode.png`, `windsurf.png`, `antigravity.png` exist but aren't referenced by any component. The `SupportedTools.tsx` component uses Lucide icons only.

**Recommendation:** Either surface these tools in the SupportedTools section or clean up the unused assets.

---

### M11. OWASP Top 10 claim in code review

**Location:** `/products/review` page claims detection of "SQL injection, XSS, command injection, exposed secrets, and other OWASP top 10 vulnerabilities."

Since the review feature delegates to an AI provider (Claude/Codex), the actual detection reliability depends on the AI model, not deterministic scanning. This claim should be qualified.

**Recommendation:** Add qualifier like "AI-powered detection of common security patterns including..." rather than implying comprehensive OWASP coverage.

---

### M12. Missing SDK documentation

`packages/sdk` exists as a core package but there's no `docs/sdk/` section explaining the SDK's public API or how to use it programmatically.

**Recommendation:** Create basic SDK reference docs or note it's internal-only if not intended for public consumption.

---

## LOW Issues

### L1. JSON-LD `operatingSystem` missing Windows

**Location:** `apps/www/src/app/page.tsx:23` — JSON-LD structured data lists only `"Linux, macOS"` but there's a Windows install tab in the Hero section.

**Recommendation:** Add "Windows" to the `operatingSystem` string.

---

### L2. Missing JSON-LD on several pages

`/cli`, `/integrations`, `/security`, `/pricing` pages lack `SoftwareApplication` structured data that other product pages have.

**Recommendation:** Add JSON-LD to these pages for SEO.

---

### L3. Codex link may go stale

SupportedTools links to `https://openai.com/index/introducing-codex/` (blog announcement post). Blog URLs frequently change or go stale.

**Recommendation:** Link to official Codex documentation instead.

---

### L4. macOS `launchctl` syntax is deprecated

`docs/self-hosting/macos-setup.md` uses `launchctl load`/`unload` which is deprecated since macOS Ventura (13+). Modern syntax is `launchctl bootstrap`/`bootout`.

**Recommendation:** Update or document both old and new syntax.

---

### L5. Contributing guide missing `packages/vscode`

`docs/contributing/guide.md` lists the monorepo package structure but omits `packages/vscode`.

**Recommendation:** Add it to the package tree.

---

### L6. macOS and Linux install tabs have identical commands

Hero section shows separate macOS and Linux tabs but both display `curl -fsSL https://locusai.dev/install.sh | bash`. This is correct (same script auto-detects), but having two tabs with identical content may confuse users.

**Recommendation:** Either merge into a single "macOS / Linux" tab, or add a brief note like "Same script — auto-detects your OS."

---

### L7. Default model confusion

- `docs/getting-started/workspace-setup.md` shows `"model": "claude-sonnet-4-5-20250929"` as example
- SDK's `DEFAULT_MODEL` for Claude is `"opus"`
- Users may not know what the actual default is

**Recommendation:** Clarify which model is used by default and show it consistently.

---

### L8. Missing glossary

No centralized definition of key terms (workspace, sprint, dispatch, task tiers, worktree, etc.). Some terms are used without introduction.

**Recommendation:** Add a glossary page or ensure key terms are defined on first use.

---

### L9. Contributing link branch name

**Location:** `apps/www/src/components/layout/Footer.tsx:168`
- Links to `https://github.com/asgarovf/locusai/blob/master/CONTRIBUTING.md`
- Verify that the default branch is `master` (not `main`) to avoid redirect.

---

## Content Quality Summary

### Landing Page Strengths
- Clean, modern design with effective terminal animations
- Clear value proposition: "Plan sprints, dispatch tasks to AI agents, ship code"
- Well-organized product showcase with 5 distinct products
- Strong security messaging ("Your code never leaves your machine")
- Good SEO metadata with proper OpenGraph and structured data
- Effective pricing page — "free and open source" is a strong message
- Privacy policy and terms of service are comprehensive and up-to-date

### Documentation Strengths
- Well-structured with clear navigation (SUMMARY.md)
- Consistent use of admonitions (hint, warning, danger)
- Excellent Mermaid diagrams for architecture and workflows
- Self-hosting guides cover Linux, macOS, and Windows thoroughly
- Telegram command reference is comprehensive
- `json-stream.md` protocol spec is excellent technical writing
- Getting started flow is clear and actionable

### Areas for Improvement
- **Accuracy first:** Fix all CRITICAL issues before any marketing push
- **Feature parity:** Only document and market what's actually implemented
- **Internal vs. public:** Separate ops runbooks and planning artifacts from user-facing docs
- **Cross-referencing:** Better internal linking between related pages (concepts ↔ CLI reference)
- **Completeness:** Document all implemented commands (`discuss`, `upgrade`, `version`)

---

## Issue Count Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 10 |
| MEDIUM | 12 |
| LOW | 9 |
| **Total** | **36** |

---

## Recommended Priority Order

1. **Fix CRITICAL issues (C1-C5):** Remove or update all references to non-existent features (`--agents`, `--auto-push`, `locus agents`, `locus login`, `locus dash`, mindmaps)
2. **Fix HIGH issues (H1-H10):** Consistency fixes, broken links, hidden docs, missing command docs
3. **Fix MEDIUM issues (M1-M12):** Accuracy improvements, terminology, misplaced content
4. **Address LOW issues (L1-L9):** Polish, SEO, minor improvements
