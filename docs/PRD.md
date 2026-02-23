# Product Requirements Document: Locus — Customer Intelligence to Code

**Version:** 1.0
**Date:** February 23, 2026
**Author:** Product Team
**Status:** Draft for Review

---

## 1. Executive Summary

Locus should evolve from an AI-native project management platform into the first product that connects the entire pipeline from **raw customer feedback** to **codebase-aware implementation specs** to **AI agent execution**.

Today, Locus's core loop is `plan → dispatch → execute → review`. The new core loop becomes `feedback → synthesize → map to code → generate agent tasks → execute → close the loop with customers`. This preserves everything Locus already does well (local execution, cognitive context, sprint planning, agent orchestration) while adding the upstream intelligence layer that no competitor has built.

**The one-sentence pitch:** Paste customer feedback, connect your repo, get agent-ready specs that know which files to change — then execute them with one click.

**Why now:** AI coding agents (Claude Code, Cursor, Codex) have reached critical mass — Cursor alone hit $500M ARR. These agents consume engineering specs. The market is flooded with tools that *produce* feedback insights and tools that *consume* specs, but almost nothing bridges the two. Only one early-stage competitor (Circuit, at $19–$249/month) has attempted the full pipeline. The gap is validated by a16z's analysis of the AI development stack, by Amplitude's acquisition of Kraftful, and by the structural disconnect between feedback platforms and developer tools.

---

## 2. Problem Statement

### The Broken Pipeline

Engineering teams today use 3–5 disconnected tools to go from "customer complaint" to "merged PR":

1. **Feedback lives in silos.** Support tickets in Intercom, reviews in App Store Connect, NPS in Delighted, interview notes in Google Docs, feature requests in Slack. Nobody reads all of it. Most of it is never read at all.

2. **Synthesis is manual and slow.** A PM spends hours reading tickets, manually tagging themes, building spreadsheets. The output is a bullet-point list in a Notion doc. Themes are subjective, frequency counts are approximate, and the analysis is stale by the time it's shared.

3. **Specs don't know the codebase.** Even when themes are identified and PRDs written, the specs say "improve checkout flow" — not "refactor `CheckoutForm.tsx`, optimize `calculateTotals()`, add index to `orders.user_id`." Engineers must manually translate product intent into technical plans.

4. **Agent tasks lack context.** Teams using Claude Code or Cursor write prompts from scratch. They don't include customer evidence, affected file paths, or acceptance criteria grounded in real user needs. The agent produces code that technically works but may not address the actual customer pain.

5. **The loop never closes.** When a feature ships, nobody goes back to the 142 customers who asked for it. There is no mechanism to measure whether shipped features actually resolved the complaints that motivated them.

### Who Feels This Pain

| Persona | Current Pain | What They Want |
|---------|-------------|----------------|
| **PM / Product Lead** | Spends 40% of time reading and tagging feedback manually. Themes are subjective. Can't prove revenue impact to leadership. | Automated synthesis with frequency counts, revenue correlation, and customer quotes — ready to share with leadership in a click. |
| **Engineering Lead** | Receives vague specs ("make search faster"). Must manually map features to code. Context is lost between PM handoff and implementation. | Code-aware specs that name the files, routes, and schemas to change. Agent-ready tasks with full context. |
| **Founding Engineer / Solo Dev** | Does everything — reads feedback, writes specs, writes code. Context-switching kills productivity. | Paste feedback, get tasks, run agents. Collapse 5 steps into 1 flow. |
| **Head of CX / Support** | Has the richest customer signal but no way to translate it into product action. Creates "top issues" reports nobody reads. | A system where support data automatically flows into engineering work. Visibility into which issues got fixed. |

---

## 3. Product Vision

### The Core Loop

```
FEEDBACK SOURCES                    LOCUS                         EXECUTION
─────────────────    ──────────────────────────────────    ─────────────────
                     ┌──────────┐   ┌──────────────┐
Intercom      ──────►│          │   │              │
Zendesk       ──────►│ INGEST   │──►│  SYNTHESIZE  │──► Themes + Evidence
Slack         ──────►│ CLASSIFY │   │  CLUSTER     │    Frequency + Urgency
App Store     ──────►│ DEDUP    │   │  RANK        │    Revenue Impact
NPS Surveys   ──────►│          │   │              │
CSV/Paste     ──────►└──────────┘   └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                     GitHub Repo ──►│  CODE MAP    │──► Affected Files
                                    │  File tree   │    Route Changes
                                    │  API routes  │    Schema Migrations
                                    │  DB schemas  │    Component Updates
                                    │  Components  │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │  GENERATE    │
                                    │  TASKS       │──► Agent-ready specs
                                    │              │    with code context
                                    └──────┬───────┘
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                         Claude Code    Cursor     Linear/GitHub
                         (via Locus     (via        (via API)
                          run)          MCP/copy)
```

### What Makes This Different

1. **Feedback platforms** (Enterpret, Productboard, Unwrap.ai) stop at dashboards and themes. They output "checkout is the #1 pain point" but never touch code.

2. **Spec generators** (ChatPRD, Traycer) start from PM prompts, not customer data. They produce generic PRDs without codebase awareness.

3. **Code-aware agents** (Sweep, Copilot, Claude Code) consume developer-written issues. They don't create issues from feedback.

4. **Circuit** (the only direct competitor) connects the pipeline but is very early-stage, limited to $249/month pricing, narrow feedback ingestion (widget + Slack + CSV only), and unclear codebase analysis depth.

**Locus is the first to unify all three layers — and it already has the agent execution infrastructure to close the loop.**

---

## 4. Product Requirements

### 4.1 Feedback Ingestion Engine

**Goal:** Accept customer feedback from any source, classify each item, and store it for synthesis.

#### 4.1.1 Manual Input (MVP — Week 1)

| Requirement | Priority | Detail |
|-------------|----------|--------|
| Paste raw text | P0 | Free-form text box. User pastes support tickets, reviews, interview notes — any unstructured text. System splits by paragraph or detected boundaries. |
| Upload CSV/JSON | P0 | Structured upload with column mapping. Auto-detect columns for `text`, `date`, `source`, `customer_id`, `sentiment`. |
| Sample data | P0 | Pre-loaded sample datasets ("SaaS app reviews", "E-commerce feedback") for zero-friction trial. |
| No-signup playground | P0 | Users can paste feedback and see synthesis results WITHOUT creating an account. Results are ephemeral until they sign up. This is critical for conversion. |

#### 4.1.2 Live Integrations (Post-MVP — Week 5+)

| Integration | Priority | Method | Data Pulled |
|-------------|----------|--------|-------------|
| Intercom | P1 | Webhook + REST API | Conversations, tags, ratings |
| Slack | P1 | Bot + Channel monitoring | Messages from designated channels |
| GitHub Issues | P1 | Webhook + API | Issue body, comments, labels |
| Zendesk | P2 | REST API + Webhook | Tickets, satisfaction ratings |
| App Store (iOS) | P2 | RSS/API scraping | Reviews with ratings and versions |
| Google Play | P2 | API | Reviews with ratings and versions |
| PostHog | P3 | Webhook | Survey responses, session context |
| Delighted/Wootric | P3 | API | NPS responses with scores |
| Gong | P3 | API | Call transcripts, key moments |

#### 4.1.3 Classification Pipeline

Each feedback item is classified by AI into:

| Field | Type | Values |
|-------|------|--------|
| `intent` | enum | `feature_request`, `bug_report`, `complaint`, `question`, `praise`, `churn_signal` |
| `urgency` | enum | `critical`, `high`, `medium`, `low` |
| `sentiment` | float | -1.0 (very negative) to 1.0 (very positive) |
| `category` | string | Auto-generated domain labels (e.g., "authentication", "search", "billing") — adaptive taxonomy per workspace |
| `deduplicatedTo` | uuid? | If this item is semantically identical to an existing item, link to it instead of creating a new theme entry |

**Performance target:** Classify 500 items in under 30 seconds. Use batch API calls. Show streaming progress UI during processing.

---

### 4.2 Synthesis Engine

**Goal:** Cluster classified items into themes, rank by impact, and surface actionable insights.

#### 4.2.1 Theme Clustering

- Group feedback items by semantic similarity (not just keyword matching)
- Each theme has: title (auto-generated), description, mention count, representative quotes, urgency score (aggregate), sentiment trend
- Themes are workspace-scoped and evolve over time (new feedback merges into existing themes or creates new ones)
- Deduplication within and across themes — same customer saying the same thing in two channels counts once

#### 4.2.2 Ranking

Themes are ranked by a composite score:

```
impact_score = (mention_count × 0.4) + (urgency_weighted × 0.3) + (revenue_signal × 0.2) + (recency × 0.1)
```

Where:
- `mention_count` = normalized count of unique feedback items
- `urgency_weighted` = average urgency score (critical=4, high=3, medium=2, low=1)
- `revenue_signal` = number of items from identifiable enterprise/high-value accounts (via customer_ref or integration metadata)
- `recency` = decay function favoring feedback from the last 30 days

#### 4.2.3 Theme Detail View

Each theme expands to show:
- All constituent feedback items with source attribution
- Extracted feature requests (distinct actionable items within the theme)
- Sentiment trend over time (chart)
- Customer quotes (best representative examples)
- Revenue impact estimate (when customer data is available)

#### 4.2.4 Dashboard

| Component | Description |
|-----------|-------------|
| **Theme List** | Ranked list of all active themes with mention count, urgency, and status |
| **Trending** | Themes with the fastest growth in mentions over the last 7 days |
| **New This Week** | Recently emerged themes |
| **Shipped** | Themes that have been resolved by shipped features, with impact stats |
| **Priority Matrix** | 2×2 grid (impact × effort) for visual prioritization |
| **Stats Cards** | Total feedback items, active themes, shipped features, revenue impact |

---

### 4.3 Codebase Connection (Code Mapping Engine)

**Goal:** Connect a GitHub repository and build a structural index that maps product concepts to actual code locations.

#### 4.3.1 Repository Connection

| Requirement | Priority | Detail |
|-------------|----------|--------|
| GitHub OAuth | P0 | Read-only access to selected repositories. User selects which repo(s) to connect per workspace. |
| Structural indexing | P0 | Parse the repo and extract: file tree, directory structure, export graph, route definitions (Express, Next.js, FastAPI), database schema (Prisma, TypeORM, SQL migrations), component hierarchy (React/Vue/Svelte), API surface (REST endpoints, GraphQL resolvers). |
| Privacy model | P0 | **Index structure, not content.** Store file paths, export names, function signatures, route patterns, schema model names and field names. Do NOT store full source code. Display clear messaging: "We analyze the structure, not the content." |
| Re-indexing | P1 | Webhook-triggered re-index on push to main/default branch. Manual re-index button. |
| Multi-repo | P2 | Connect multiple repos to a single workspace (e.g., frontend + backend + mobile). |

#### 4.3.2 Index Structure

The repo index stores:

```typescript
interface RepoIndex {
  repoUrl: string;
  defaultBranch: string;
  lastIndexedAt: Date;
  techStack: TechStack;        // detected frameworks, languages, package manager
  fileTree: FileNode[];         // hierarchical file structure with descriptions
  routes: RouteDefinition[];    // API endpoints with path, method, handler file
  dbModels: DatabaseModel[];    // Schema models with fields and relations
  components: ComponentNode[];  // UI component tree with props and imports
  exports: ExportMap;           // module export graph for dependency tracing
}
```

#### 4.3.3 Code-Aware Proposal Generation

When a theme is selected for implementation, the system:

1. Takes the theme description + feature requests + representative quotes
2. Sends them to AI along with the repo index
3. AI identifies which files, routes, schemas, and components are relevant
4. Generates a **proposal** with:
   - **Why build this:** Customer evidence (quotes, frequency, urgency, revenue impact)
   - **What to change:** File tree showing affected files with brief annotations
   - **Estimated scope:** Files modified, files created, schema migrations needed
   - **Complexity:** Low / Medium / High
   - **Suggested task count:** How many agent tasks this decomposes into

**This is the screen no competitor has.** Nobody shows "here are the exact files in YOUR repo that need to change, and here's why 142 customers are asking for it."

---

### 4.4 Task Generation & Export

**Goal:** Convert code-aware proposals into structured, agent-ready tasks and export them to any execution target.

#### 4.4.1 Task Decomposition

From a proposal, generate N tasks (typically 2–5), each containing:

| Field | Description |
|-------|-------------|
| `title` | Concise task name |
| `description` | Full context: what to do, why (customer evidence), where (file paths), how (approach guidance) |
| `acceptanceCriteria` | Specific, testable conditions derived from customer needs |
| `affectedFiles` | List of files this task touches, with annotations |
| `priority` | Inherited from theme urgency |
| `order` | Execution sequence (foundation tasks first) |
| `customerEvidence` | Representative quotes that motivated this task |
| `complexity` | Estimated effort |

Tasks follow Locus's existing sequential execution model — each is self-contained, no forward dependencies, foundation work first.

#### 4.4.2 Export Targets

| Target | Format | Method | Priority |
|--------|--------|--------|----------|
| **Locus Sprint** | Native sprint + tasks | Internal — creates sprint in current workspace, runnable via `locus run` | P0 |
| **Claude Code** | Markdown task file + context prompt | Copy to clipboard or save as `.md` file | P0 |
| **Cursor** | `.cursor/rules` context + Composer prompt | Copy or download | P1 |
| **GitHub Issues** | Issues with labels, assignee, body with code references | GitHub API (uses connected repo) | P1 |
| **Linear** | Linear issues with project/cycle assignment | Linear OAuth + API | P2 |
| **Codex** | Task prompt with repo context | Copy to clipboard | P2 |
| **Copy Markdown** | Plain markdown | Clipboard | P0 |

#### 4.4.3 Locus Sprint Integration

The primary export path is into Locus's own sprint system. When a user clicks "Generate Agent Tasks" and selects "Create Sprint":

1. A new Sprint is created with the theme name
2. ProposalTasks become Tasks with full descriptions and acceptance criteria
3. The sprint can be activated and run immediately via `locus run`
4. The existing execution pipeline handles everything: branch creation, agent dispatch, code writing, commit, push, PR creation

**This is the killer integration.** No other feedback tool can go from "142 customers complained about auth" to "running AI agent fixing auth on a branch" in under 5 minutes.

---

### 4.5 Closed-Loop System

**Goal:** When features ship, trace them back to the feedback that motivated them and measure impact.

#### 4.5.1 Ship Detection

- **PR merge detection:** When a PR created by Locus is merged, check which proposal/theme it maps to
- **Manual marking:** User can manually mark a theme as "shipped" with a link to the PR or release
- **Sprint completion:** When a sprint generated from a theme completes, auto-suggest marking the theme as shipped

#### 4.5.2 Impact Measurement

When a theme is marked shipped:
- Show how many feedback items this resolves
- Show which customers are affected
- Track whether new feedback on this topic decreases after shipping (sentiment improvement)
- Display in the dashboard's "Shipped" section with before/after metrics

#### 4.5.3 Customer Notification (P2)

- Draft a changelog entry from the theme + proposal
- Optionally notify affected customers via connected integration (Intercom message, email)
- "You asked, we built" notification template

#### 4.5.4 Weekly Digest

Automated email or Slack digest per workspace:
- Trending themes (fastest growth)
- New themes emerged this week
- Shipped features and their impact
- Suggested next priority
- Link to dashboard

---

## 5. Data Model

### 5.1 New Entities

These are new database entities added to the existing TypeORM schema:

```
FeedbackSource
──────────────
id                  uuid (PK)
workspaceId         uuid (FK → workspaces)
type                enum: 'manual_paste', 'csv_upload', 'intercom', 'slack',
                          'github_issues', 'zendesk', 'app_store_ios',
                          'google_play', 'posthog', 'delighted', 'gong'
name                string (user-friendly label, e.g. "Production Intercom")
config              jsonb (API keys, webhook URLs, channel IDs — encrypted)
status              enum: 'active', 'paused', 'error'
lastSyncAt          timestamptz
itemCount           integer
createdAt           timestamptz
updatedAt           timestamptz


FeedbackItem
────────────
id                  uuid (PK)
workspaceId         uuid (FK → workspaces)
sourceId            uuid (FK → feedback_sources, nullable for paste)
rawText             text
classifiedIntent    enum: 'feature_request', 'bug_report', 'complaint',
                          'question', 'praise', 'churn_signal'
sentiment           float (-1.0 to 1.0)
urgency             enum: 'critical', 'high', 'medium', 'low'
category            varchar (auto-generated adaptive label)
customerRef         varchar (nullable — email, account ID, or name from source)
revenueSignal       float (nullable — ARR or account value if known)
deduplicatedToId    uuid (FK → feedback_items, nullable)
themeId             uuid (FK → themes, nullable — assigned during synthesis)
metadata            jsonb (source-specific metadata: ticket ID, review rating, etc.)
createdAt           timestamptz


Theme
─────
id                  uuid (PK)
workspaceId         uuid (FK → workspaces)
title               varchar
description         text
mentionCount        integer
urgencyScore        float (computed aggregate)
sentimentAvg        float (computed aggregate)
revenueImpact       float (nullable — estimated ARR at risk)
impactScore         float (computed composite ranking score)
status              enum: 'active', 'shipped', 'dismissed', 'archived'
shippedAt           timestamptz (nullable)
shippedPrUrl        varchar (nullable)
createdAt           timestamptz
updatedAt           timestamptz


RepoIndex
─────────
id                  uuid (PK)
workspaceId         uuid (FK → workspaces)
repoUrl             varchar
defaultBranch       varchar
techStack           jsonb (detected frameworks, languages)
indexData           jsonb (file tree, routes, schemas, components, exports)
fileCount           integer
routeCount          integer
schemaModelCount    integer
lastIndexedAt       timestamptz
createdAt           timestamptz
updatedAt           timestamptz


Proposal
────────
id                  uuid (PK)
workspaceId         uuid (FK → workspaces)
themeId             uuid (FK → themes)
repoIndexId         uuid (FK → repo_indices)
title               varchar
evidence            jsonb (array of {quote, source, customerRef})
affectedFiles       jsonb (array of {path, annotation, action: 'modify'|'create'|'delete'})
estimatedScope      jsonb ({filesModified, filesCreated, schemaMigrations})
complexity          enum: 'low', 'medium', 'high'
suggestedTaskCount  integer
status              enum: 'draft', 'approved', 'exported', 'archived'
createdAt           timestamptz
updatedAt           timestamptz


ProposalTask
────────────
id                  uuid (PK)
proposalId          uuid (FK → proposals)
title               varchar
description         text (full context including customer evidence and file paths)
acceptanceCriteria  jsonb (array of {id, text, done})
affectedFiles       jsonb (array of file paths with annotations)
customerEvidence    jsonb (array of {quote, source})
complexity          enum: 'low', 'medium', 'high'
priority            enum: 'low', 'medium', 'high', 'critical'
order               integer
exportedTo          varchar (nullable — 'locus_sprint', 'github_issues', 'linear', etc.)
exportedRef         varchar (nullable — sprint ID, issue URL, etc.)
createdAt           timestamptz
```

### 5.2 Modified Entities

| Entity | Change |
|--------|--------|
| `Workspace` | Add optional `githubAccessToken` (encrypted), `githubRepo` string, `feedbackSettings` jsonb |
| `Sprint` | Add optional `proposalId` FK — to trace sprints back to the proposal/theme that created them |
| `Task` | Add optional `proposalTaskId` FK — to trace tasks back to the proposal task that generated them |

### 5.3 Entity Relationships

```
Workspace ──1:N──► FeedbackSource
Workspace ──1:N──► FeedbackItem
Workspace ──1:N──► Theme
Workspace ──1:N──► RepoIndex
Workspace ──1:N──► Proposal

FeedbackSource ──1:N──► FeedbackItem
Theme ──1:N──► FeedbackItem
Theme ──1:N──► Proposal

Proposal ──N:1──► Theme
Proposal ──N:1──► RepoIndex
Proposal ──1:N──► ProposalTask

ProposalTask ──1:1?──► Task (when exported to Locus sprint)
Proposal ──1:1?──► Sprint (when exported to Locus sprint)
```

---

## 6. API Design

### 6.1 New API Modules

All endpoints are workspace-scoped and require authentication.

#### Feedback Module (`/api/workspaces/:workspaceId/feedback`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Ingest raw feedback (paste or CSV upload) |
| `POST` | `/ingest/sample` | Load sample dataset for playground |
| `GET` | `/items` | List feedback items with filters (intent, urgency, theme, source) |
| `GET` | `/items/:id` | Get single feedback item detail |
| `DELETE` | `/items/:id` | Delete a feedback item |
| `GET` | `/sources` | List connected feedback sources |
| `POST` | `/sources` | Add a new feedback source (integration config) |
| `PUT` | `/sources/:id` | Update source config |
| `DELETE` | `/sources/:id` | Disconnect a feedback source |
| `POST` | `/sources/:id/sync` | Trigger manual sync for a source |

#### Themes Module (`/api/workspaces/:workspaceId/themes`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List themes, sorted by impact score. Supports filters: status, min mentions |
| `GET` | `/:id` | Theme detail with all feedback items, quotes, trend data |
| `GET` | `/:id/trend` | Sentiment and mention count trend over time |
| `PATCH` | `/:id` | Update theme (title, description, status) |
| `POST` | `/:id/dismiss` | Dismiss a theme (remove from active list) |
| `POST` | `/:id/ship` | Mark a theme as shipped with PR URL |
| `POST` | `/synthesize` | Trigger re-synthesis of all feedback items into themes |

#### Repos Module (`/api/workspaces/:workspaceId/repos`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/connect` | Connect a GitHub repo (OAuth token + repo selection) |
| `GET` | `/` | List connected repos with index status |
| `GET` | `/:id` | Repo index detail (tech stack, file count, route count) |
| `POST` | `/:id/reindex` | Trigger re-indexing |
| `DELETE` | `/:id` | Disconnect a repo |

#### Proposals Module (`/api/workspaces/:workspaceId/proposals`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/generate` | Generate a proposal from a theme + repo index |
| `GET` | `/` | List proposals with status filter |
| `GET` | `/:id` | Proposal detail with tasks |
| `PATCH` | `/:id` | Update proposal (edit before export) |
| `POST` | `/:id/approve` | Approve proposal for export |
| `POST` | `/:id/export` | Export to target (locus_sprint, github_issues, linear, clipboard) |
| `DELETE` | `/:id` | Delete/archive proposal |

#### Playground Module (`/api/playground`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze` | Anonymous endpoint — accepts raw text, returns themes. No auth required. Results expire after 24 hours. Rate-limited. |

---

## 7. User Interface

### 7.1 New Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| **Feedback** | `/feedback` | Paste/upload interface + list of all feedback items with filters |
| **Themes** | `/themes` | Ranked theme list with cards showing mention count, urgency, status |
| **Theme Detail** | `/themes/:id` | Deep dive into a theme: quotes, items, trend chart, proposals |
| **Repos** | `/settings/repos` | Connect GitHub repos, view index status |
| **Proposals** | `/proposals` | List of generated proposals with status |
| **Proposal Detail** | `/proposals/:id` | Code-aware file tree, customer evidence, task breakdown, export buttons |
| **Intelligence Dashboard** | `/` (new home) | Overview: stats cards, trending, new themes, shipped, priority matrix |
| **Playground** | `/try` (public, no auth) | Paste feedback → see themes. CTA to sign up and connect repo. |

### 7.2 Navigation Updates

The existing sidebar navigation gains new top-level items:

```
── Intelligence (new home/overview)
── Feedback
── Themes
── Proposals
── ─────────── (divider)
── Board (existing)
── Backlog (existing)
── Docs (existing)
── Activity (existing)
── ─────────── (divider)
── Settings
   ├── Profile (existing)
   ├── Team (existing)
   ├── API Keys (existing)
   ├── Repos (new)
   └── Integrations (new)
```

### 7.3 Key UI Components

| Component | Description |
|-----------|-------------|
| `FeedbackPasteBox` | Large text area with placeholder text, sample data buttons, CSV upload, analyze button |
| `AnalysisProgress` | Streaming progress indicator: classifying, deduplicating, clustering, ranking |
| `ThemeCard` | Card with title, mention count bar, urgency badge, top quote preview, expand/detail button |
| `ThemeDetail` | Full theme view with tabs: Overview, Quotes, Items, Trend, Proposals |
| `PriorityMatrix` | 2×2 drag-and-drop grid (impact × effort) with theme dots |
| `RepoConnector` | GitHub OAuth flow → repo selector → indexing progress |
| `ProposalView` | File tree with annotations, customer evidence panel, scope summary, export buttons |
| `TaskPreview` | Expandable task cards within a proposal showing description, files, acceptance criteria |
| `ExportModal` | Target selector (Locus Sprint, Claude Code, Cursor, GitHub, Linear) with format preview |
| `ShippedBanner` | Celebratory component showing resolved feedback count when a theme is shipped |
| `WeeklyDigest` | Email template with trending, new, shipped, and suggested next |
| `StatCard` | Reuse existing component for: total items, active themes, shipped features, revenue impact |

---

## 8. Technical Architecture

### 8.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOCUS CLOUD                                  │
│                                                                     │
│  ┌───────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ NestJS API│  │ Feedback   │  │ Synthesis    │  │ Code Mapper │ │
│  │ (existing)│  │ Module     │  │ Module       │  │ Module      │ │
│  │           │  │            │  │              │  │             │ │
│  │ Auth      │  │ Ingest     │  │ Classify     │  │ GitHub API  │ │
│  │ Workspaces│  │ Store      │  │ Cluster      │  │ AST Parse   │ │
│  │ Sprints   │  │ Deduplicate│  │ Rank         │  │ Route Detect│ │
│  │ Tasks     │  │            │  │ Theme CRUD   │  │ Schema Read │ │
│  │ Events    │  │            │  │              │  │ Store Index │ │
│  └───────────┘  └────────────┘  └──────────────┘  └─────────────┘ │
│                                                                     │
│  ┌────────────┐  ┌──────────────┐                                  │
│  │ Proposal   │  │ Export       │                                   │
│  │ Module     │  │ Module       │                                   │
│  │            │  │              │                                   │
│  │ Generate   │  │ Locus Sprint │                                   │
│  │ from Theme │  │ GitHub Issues│                                   │
│  │ + RepoIndex│  │ Linear       │                                   │
│  │            │  │ Markdown     │                                   │
│  └────────────┘  └──────────────┘                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL (TypeORM)                      │   │
│  │  workspaces | feedback_sources | feedback_items | themes     │   │
│  │  repo_indices | proposals | proposal_tasks                   │   │
│  │  sprints | tasks | users | organizations | ...               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │                                              │
          │ Task metadata                                │ Push changes
          ▼                                              ▼
┌─────────────────────┐                        ┌──────────────────┐
│   LOCUS CLI         │                        │   GitHub         │
│   (existing)        │                        │                  │
│   locus run         │───────────────────────►│   PRs            │
│   Agent execution   │   Code changes         │   Branches       │
│   Local-only code   │                        │   Merges         │
└─────────────────────┘                        └──────────────────┘
```

### 8.2 AI Provider Usage

| Operation | Model | Estimated Cost | Notes |
|-----------|-------|---------------|-------|
| Feedback classification (batch) | Claude Haiku 4.5 | ~$0.001/item | Fast, cheap, high accuracy for classification tasks |
| Theme synthesis | Claude Sonnet 4.6 | ~$0.05/synthesis run | Needs stronger reasoning for clustering and theme naming |
| Proposal generation | Claude Sonnet 4.6 | ~$0.10/proposal | Needs to understand code structure and map features to files |
| Task decomposition | Claude Sonnet 4.6 | ~$0.05/decomposition | Structured output with code-aware task descriptions |
| Task execution | User's chosen provider | User's API costs | Existing `locus run` infrastructure, unchanged |

### 8.3 Privacy & Security

| Principle | Implementation |
|-----------|---------------|
| **Source code stays local** | The repo index stores structure (file paths, function names, route patterns, model names), NOT full source code. The existing Locus local-execution model is preserved. |
| **Feedback data in cloud** | Feedback items and themes are stored in Locus Cloud (PostgreSQL). This is necessary for the dashboard, team collaboration, and continuous synthesis. |
| **Integration credentials encrypted** | API keys for Intercom/Zendesk/etc. are encrypted at rest. Stored in `feedback_sources.config` as encrypted JSON. |
| **Playground data ephemeral** | Anonymous playground data expires after 24 hours. No PII retention for non-authenticated users. |
| **GitHub tokens scoped** | Read-only repo access. No write access. Token stored encrypted per workspace. |

---

## 9. Go-to-Market & Positioning

### 9.1 Positioning Statement

**For engineering teams** who use AI coding agents,
**Locus** is the **customer intelligence platform**
that turns raw feedback into codebase-aware, agent-ready specs.
**Unlike** feedback tools (Productboard, Enterpret) that stop at dashboards,
or spec tools (ChatPRD, Traycer) that start from PM prompts,
**Locus** connects the entire pipeline from customer complaint to merged PR.

### 9.2 Pricing (Proposed)

| Tier | Price | Limits | Target |
|------|-------|--------|--------|
| **Free** | $0 | 100 feedback items/month, 1 repo, 3 themes, no integrations | Solo devs, trial |
| **Pro** | $49/workspace/month | 5,000 items/month, 3 repos, unlimited themes, all exports | Small teams, startups |
| **Team** | $149/workspace/month | 25,000 items/month, 10 repos, live integrations, weekly digests | Growth-stage companies |
| **Enterprise** | Custom | Unlimited, SSO, audit logs, SLA, dedicated support | Large organizations |

The playground (no-signup paste-and-analyze) is always free and unlimited — it's the top-of-funnel growth engine.

### 9.3 Key Metrics

| Metric | Definition | Target (Month 6) |
|--------|-----------|-------------------|
| **Time to first theme** | Landing page → first synthesis result | < 90 seconds |
| **Playground → signup** | Conversion from anonymous playground to registered user | > 15% |
| **Signup → repo connected** | Users who connect at least one GitHub repo | > 40% |
| **Proposals generated** | Total code-aware proposals created | 1,000+ |
| **Proposals → executed** | Proposals that result in agent runs (via Locus Sprint) or issue creation | > 30% |
| **Shipped features tracked** | Themes marked as shipped with impact data | 500+ |
| **Weekly active workspaces** | Workspaces with at least one feedback ingest or proposal generated per week | 200+ |
| **NPS** | User satisfaction | > 50 |

---

## 10. Competitive Moat

### 10.1 Why This Is Defensible

1. **Three-domain expertise barrier.** Building this requires simultaneous competence in NLP/feedback analytics, product management workflows, AND deep code understanding. Most teams come from one domain. Feedback teams build dashboards. PM tools build spec generators. Dev tools build agents. Nobody bridges all three.

2. **Network effect from feedback data.** The more feedback a workspace ingests, the better the themes, the more accurate the proposals, the more useful the agent tasks. Switching costs increase over time as the system accumulates context about a team's customers and codebase.

3. **Execution infrastructure already built.** Locus has the agent execution pipeline (`locus run`), sprint management, branch/PR creation, code review, and Telegram control. A feedback platform trying to build downstream would need years to replicate this. A dev tool trying to build upstream would need to build the entire synthesis engine.

4. **Open source + self-hosting.** Trust advantage in a market where competitors are all SaaS-only. Enterprises in regulated industries can run the full stack on their infrastructure.

### 10.2 Circuit Comparison

| Dimension | Circuit | Locus |
|-----------|---------|-------|
| Feedback ingestion | Widget, Slack, Sheets, CSV, manual | All of Circuit's + Intercom, Zendesk, App Store, PostHog, Gong + paste playground |
| Code awareness | "Real file paths, tech stack context" (depth unknown) | Full structural index: routes, schemas, components, exports, dependency graph |
| Export targets | Cursor, Claude Code (MCP) | Cursor, Claude Code, GitHub Issues, Linear, Codex + native Locus Sprint execution |
| Agent execution | None (exports to external agents) | Built-in agent runtime: `locus run` executes tasks locally, creates branches and PRs |
| Pricing ceiling | $249/month | Team $149/month, Enterprise custom — undercut on SMB, capture enterprise |
| Self-hosting | No | Yes — full stack self-hostable with Telegram control |
| Market stage | Very early, no visible traction | Alpha with existing users, CLI published on npm, open-source community |

---

## 11. Build Plan

### Phase 1: Core Pipeline (Weeks 1–2)

**Goal:** A user can paste feedback, see themes, and connect a repo.

- [ ] `FeedbackSource`, `FeedbackItem`, `Theme` entities + migrations
- [ ] Feedback ingestion endpoint (paste + CSV)
- [ ] AI classification pipeline (batch Haiku calls)
- [ ] Deduplication logic (embedding similarity)
- [ ] Theme clustering + ranking algorithm
- [ ] Web UI: paste box, analysis progress, theme list, theme detail
- [ ] Sample data loader (pre-built datasets)
- [ ] Playground (anonymous, no auth, ephemeral)

### Phase 2: Code Mapping (Week 3)

**Goal:** Connect GitHub and generate code-aware proposals.

- [ ] `RepoIndex` entity + migration
- [ ] GitHub OAuth integration for repo connection
- [ ] Structural indexer: file tree, route detection, schema parsing, component mapping
- [ ] `Proposal`, `ProposalTask` entities + migrations
- [ ] Proposal generation endpoint (theme + index → code-aware spec)
- [ ] Web UI: repo connector, proposal view with file tree + evidence + scope

### Phase 3: Export & Execute (Week 4)

**Goal:** Export proposals as agent tasks and execute them.

- [ ] Export to Locus Sprint (create sprint + tasks from proposal)
- [ ] Export to Claude Code (markdown format)
- [ ] Export to Cursor (rules + prompt format)
- [ ] Export to GitHub Issues (via API)
- [ ] Export as markdown (clipboard)
- [ ] Web UI: export modal, task preview cards
- [ ] Integration test: full loop from paste → theme → proposal → sprint → `locus run`

### Phase 4: Live Integrations (Week 5)

**Goal:** Continuous feedback ingestion from production systems.

- [ ] Intercom webhook integration
- [ ] Slack bot/channel monitoring
- [ ] GitHub Issues sync
- [ ] Continuous re-synthesis (new items merge into existing themes)
- [ ] Webhook infrastructure for push-based sources

### Phase 5: Intelligence Layer (Week 6)

**Goal:** Dashboard, digests, and closed-loop tracking.

- [ ] Intelligence dashboard (stats cards, trending, priority matrix)
- [ ] Ship detection (PR merge → resolve theme)
- [ ] Impact measurement (feedback count resolved, sentiment change)
- [ ] Weekly digest (email template + Slack integration)
- [ ] Web UI: shipped section, impact stats, changelog draft
- [ ] Landing page update + public playground

### Phase 6: Scale & Polish (Weeks 7–8)

**Goal:** Production hardening and remaining integrations.

- [ ] Linear export integration
- [ ] Codex export format
- [ ] Zendesk integration
- [ ] App Store (iOS) review ingestion
- [ ] Google Play review ingestion
- [ ] Multi-repo support
- [ ] Webhook-triggered re-indexing
- [ ] Rate limiting and abuse prevention for playground
- [ ] Performance optimization (batch processing, caching)
- [ ] Onboarding tour (driver.js — reuse existing infrastructure)

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Platform absorption** — Productboard or Amplitude adds code awareness | Medium | High | Move fast. Ship before incumbents realize the gap exists. Code-aware mapping is technically hard to bolt on — it's not a weekend feature. |
| **Circuit gains traction first** | Low-Medium | Medium | Differentiate on execution (we have `locus run`), breadth of ingestion, depth of code analysis, and enterprise readiness. |
| **AI costs too high for free tier** | Medium | Medium | Use Haiku for classification (very cheap). Limit free tier to 100 items/month. Cache synthesis results. |
| **Repo indexing inaccurate** | Medium | High | Start with TypeScript/JavaScript only (our core audience). Expand language support based on demand. Use existing Locus codebase indexer as foundation. |
| **Users don't trust cloud with feedback data** | Low | Medium | Feedback is not source code — it's support tickets and reviews. The local-execution pitch applies to code, not customer feedback. Clear messaging. |
| **Scope too broad for team size** | High | Medium | Strict phase gating. Ship Phase 1-3 (core pipeline) before touching integrations. The paste → themes → proposals → sprint loop is the MVP. Everything else is growth. |

---

## 13. Success Criteria

### MVP Success (Week 4)

The product is successful at MVP if:

1. A user can paste 200+ feedback items and see synthesized themes in under 60 seconds
2. Themes are ranked by impact with representative customer quotes
3. A connected GitHub repo produces code-aware proposals with actual file paths
4. Proposals decompose into agent-ready tasks with acceptance criteria
5. Tasks export to a Locus Sprint and execute successfully via `locus run`
6. The full loop (paste → themes → proposal → sprint → agent run → PR) works end-to-end

### 6-Month Success

1. 200+ weekly active workspaces
2. 1,000+ proposals generated
3. 30%+ proposals result in executed agent tasks or created issues
4. At least 3 live integrations shipping (Intercom, Slack, GitHub Issues)
5. Measurable feedback on "time saved" from at least 20 teams
6. Positive media/community coverage validating the feedback-to-code positioning

---

## 14. What We Are NOT Building

To keep scope manageable and positioning clear:

- **We are not a CRM.** We don't manage customer accounts, deals, or pipelines.
- **We are not a survey tool.** We don't create or send surveys (we ingest responses from tools that do).
- **We are not a support desk.** We don't handle ticket routing, agent assignment, or response workflows.
- **We are not replacing the PM.** The PM still reviews themes, edits proposals, and decides what to build. We automate the analysis and translation, not the decision-making.
- **We are not building our own coding agent.** We leverage Claude, Codex, Cursor, and other agents. Our value is generating the right tasks for them, not executing code ourselves.

---

## 15. Open Questions

| Question | Options | Decision Needed By |
|----------|---------|-------------------|
| Should the playground be a separate domain (e.g., `try.locusai.dev`)? | Separate domain vs. `/try` route on main app | Phase 1 start |
| How deep should initial repo indexing go? Full AST parsing or file-tree + heuristics? | Deep AST (slower, more accurate) vs. heuristic (faster, good enough for MVP) | Phase 2 start |
| Should we support non-GitHub repos (GitLab, Bitbucket) at launch? | GitHub-only vs. multi-provider | Phase 2 start |
| How should we handle feedback in non-English languages? | Auto-translate → analyze in English vs. multi-language classification | Phase 1 start |
| Should the free tier include repo connection or just feedback analysis? | Free = feedback only (paywall at repo) vs. free = full pipeline with limits | Pre-launch pricing decision |

---

*This document represents the complete product vision for Locus's evolution from AI-native project management to customer-intelligence-to-code platform. It builds on Locus's existing infrastructure (NestJS API, Next.js dashboard, TypeORM/PostgreSQL, CLI agent runtime, sprint management) while adding the feedback → synthesis → code mapping → export pipeline that no competitor has fully built.*
