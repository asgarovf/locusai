# Zero to Hero: Complete User Flow

The entire journey from "never heard of us" to "can't live without it" — designed so the user gets value in under 3 minutes and hits the "holy shit" moment by minute 5.

---

## Philosophy

1. **Value before setup.** Show results before asking for integrations.
2. **Each step delivers something.** No "loading... configuring... please wait."
3. **The aha moment is the code-aware part.** Feedback synthesis is table stakes. Mapping features to your actual codebase is the magic.

---

## The Flow

```
LANDING PAGE ──► SIGN UP ──► PASTE FEEDBACK ──► SEE THEMES
     │              │              │                  │
     │         (30 sec)       (60 sec)           AHA #1
     │                                          "it found patterns
     │                                           I didn't see"
     │
     └──► CONNECT REPO ──► CODE-AWARE PROPOSALS ──► EXPORT TO AGENT
              │                    │                       │
          (60 sec)             AHA #2                  AHA #3
                           "it knows which          "I just got a
                            files to change"        sprint from feedback"
```

---

## Step 0: Landing Page

**What the user sees:**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Your customers already told you what to build.    │
│                                                     │
│   Paste feedback. Connect your repo.                │
│   Get agent-ready specs in 5 minutes.               │
│                                                     │
│   [ Try it now — no signup ]    [ Sign up free ]    │
│                                                     │
│   ┌───────────────────────────────────────────┐     │
│   │  DEMO: 847 support tickets → 12 features  │     │
│   │  ranked by revenue impact, mapped to your  │     │
│   │  codebase, ready for Claude Code           │     │
│   └───────────────────────────────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key decisions:**
- "Try it now — no signup" button lets users paste feedback and see synthesis WITHOUT creating an account. This is critical for conversion.
- The demo video/animation shows the full loop: raw feedback → themes → code mapping → agent export.

---

## Step 1: The No-Signup Playground (Time to value: 90 seconds)

**User clicks "Try it now."** No email, no password, nothing.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Paste customer feedback                           │
│   ┌───────────────────────────────────────────┐     │
│   │                                           │     │
│   │  Support tickets, reviews, interview      │     │
│   │  notes, NPS responses — paste anything.   │     │
│   │                                           │     │
│   │  Or try with sample data:                 │     │
│   │  [ SaaS app reviews ]  [ E-commerce ]     │     │
│   │                                           │     │
│   └───────────────────────────────────────────┘     │
│                                                     │
│   Or upload:  [ CSV ]  [ JSON ]                     │
│                                                     │
│            [ Analyze → ]                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**What happens:**
1. User pastes raw text (support tickets, app store reviews, interview notes, anything)
2. Or clicks "SaaS app reviews" to use sample data (removes friction completely)
3. Clicks "Analyze"

**Behind the scenes:**
- Text is chunked and sent to AI for classification
- Each item is tagged: intent (feature request, bug, complaint, praise), urgency, sentiment
- Duplicates are detected and merged
- Themes are clustered

**Processing takes 10-30 seconds.** Show a real-time streaming UI:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Analyzing 234 feedback items...                   │
│                                                     │
│   ✓ Classified 234 items                            │
│   ✓ Removed 41 duplicates                           │
│   ✓ Found 8 themes                                  │
│   ◉ Ranking by impact...                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Step 2: AHA Moment #1 — Theme Discovery (Minute ~2)

The synthesis results appear. This is where the user thinks "oh, this actually works."

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  8 themes from 234 feedback items                     [Export]  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ #1  Authentication is broken                    142 mentions│ │
│  │     ████████████████████████████████░░░░░░░░    HIGH URGENCY│ │
│  │                                                             │ │
│  │  "SSO login fails every morning, I have to clear cookies"   │ │
│  │  "OAuth redirect just spins forever on mobile"              │ │
│  │  "We can't use this until SAML works — it's a dealbreaker" │ │
│  │                                                             │ │
│  │  Feature requests: SSO improvements, SAML support,          │ │
│  │  session persistence, mobile auth fix                       │ │
│  │                                                  [Details]  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ #2  Search is too slow                           89 mentions│ │
│  │     █████████████████████░░░░░░░░░░░░░░░░░░   MED URGENCY  │ │
│  │                                                             │ │
│  │  "Search takes 10+ seconds, unusable for large catalogs"    │ │
│  │  "Full-text search doesn't find partial matches"            │ │
│  │                                                  [Details]  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  #3  Missing bulk export ........................... 67 mentions│ │
│  #4  Mobile app crashes ........................... 54 mentions │ │
│  #5  Dashboard is confusing ....................... 43 mentions │ │
│  ...                                                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Want code-aware specs? Connect your repo →                 │ │
│  │  [ Connect GitHub ]          [ Sign up to save ]            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**What the user gets WITHOUT signing up:**
- Ranked themes with frequency and urgency
- Representative customer quotes for each theme
- Extracted feature requests per theme
- Sentiment breakdown

**The hook at the bottom:** "Want code-aware specs? Connect your repo." This is the upgrade prompt. Value first, then the ask.

---

## Step 3: Sign Up + Connect Repo (Minute ~3)

User signs up (Google OAuth — one click) and connects their GitHub repo.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Connect your codebase                             │
│                                                     │
│   We'll index your repo to map features to your     │
│   actual code. Nothing is uploaded — we analyze      │
│   the structure, not the content.                   │
│                                                     │
│   [ Connect GitHub ]                                │
│                                                     │
│   Select repository:                                │
│   ┌───────────────────────────────────────────┐     │
│   │  ▸ acme/web-app              ★ 234       │     │
│   │    acme/mobile-app           ★ 89        │     │
│   │    acme/api-server           ★ 156       │     │
│   └───────────────────────────────────────────┘     │
│                                                     │
│   Indexing acme/web-app...                          │
│   ✓ 847 files analyzed                              │
│   ✓ 12 API routes detected                          │
│   ✓ 8 database models found                         │
│   ✓ Component tree mapped                           │
│                                                     │
│           [ Continue → ]                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Behind the scenes:**
- GitHub OAuth → read-only repo access
- Clone + semantic index (file tree, exports, route definitions, DB schema, component hierarchy)
- The index is stored, NOT the source code
- Takes ~30-60 seconds for a typical repo

**Privacy messaging is critical here:** "We analyze the structure, not the content." This inherits Locus's existing local-first philosophy.

---

## Step 4: AHA Moment #2 — Code-Aware Feature Proposals (Minute ~5)

This is the magic. The themes from Step 2 are now mapped to the user's actual codebase.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Feature Proposal: Fix Authentication (142 mentions)             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│                                                                  │
│  WHY BUILD THIS                                                  │
│  "SSO login fails every morning" — 67 users                     │
│  "SAML is a dealbreaker for enterprise" — 31 users              │
│  "OAuth redirect spins on mobile" — 44 users                    │
│  Revenue at risk: ~$48K ARR (12 enterprise accounts mentioned)  │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  WHAT TO CHANGE IN YOUR CODE                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ src/auth/                                            │       │
│  │   ├── oauth-provider.ts    ← Fix redirect loop      │       │
│  │   ├── session-manager.ts   ← Add persistence        │       │
│  │   └── saml/                ← New: SAML provider      │       │
│  │                                                      │       │
│  │ src/middleware/auth.middleware.ts                     │       │
│  │   └── Update token refresh logic                     │       │
│  │                                                      │       │
│  │ prisma/schema.prisma                                 │       │
│  │   └── Add: SamlConfig model, update User relations   │       │
│  │                                                      │       │
│  │ src/api/routes/auth.routes.ts                        │       │
│  │   └── Add: /auth/saml/callback, /auth/saml/metadata │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ESTIMATED SCOPE                                                │
│  5 files modified, 2 files created, 1 schema migration          │
│  Complexity: Medium  •  Suggested: 3 agent tasks                │
│                                                                  │
│  [ Generate Agent Tasks ]    [ Edit Proposal ]    [ Skip ]      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**This is the screen no competitor has.** Circuit gives you a text spec. Productboard gives you a prioritized list. Nobody shows you "here are the exact files in YOUR repo that need to change, here's the schema migration you need, and here's why 142 customers are asking for it."

---

## Step 5: AHA Moment #3 — One-Click Agent Export (Minute ~6)

User clicks "Generate Agent Tasks." The system produces structured, context-rich tasks.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Sprint: Fix Authentication                      3 tasks        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 1/3: Fix OAuth redirect loop on mobile              │  │
│  │ Priority: HIGH  •  Files: oauth-provider.ts, auth.test.ts│  │
│  │                                                           │  │
│  │ Context: 44 users report OAuth redirect spinning forever  │  │
│  │ on mobile Safari and Chrome. Root cause likely in the     │  │
│  │ callback URL handling in oauth-provider.ts line 47-89.    │  │
│  │                                                           │  │
│  │ Acceptance criteria:                                      │  │
│  │ • OAuth login works on mobile Safari and Chrome           │  │
│  │ • Callback handles both /auth/callback and /callback      │  │
│  │ • Add test coverage for mobile user-agent redirects       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 2/3: Add session persistence across browser restart  │  │
│  │ Priority: HIGH  •  Files: session-manager.ts, schema.prisma│ │
│  │ ...                                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 3/3: Implement SAML SSO provider                     │  │
│  │ Priority: MEDIUM  •  Files: NEW saml/, auth.routes.ts     │  │
│  │ ...                                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Export as:                                                      │
│  [ Claude Code ]  [ Cursor ]  [ GitHub Issues ]  [ Linear ]    │
│  [ Copy Markdown ]  [ Codex ]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Export formats:**

- **Claude Code**: Generates a `.md` task file with full context + a `claude` command to execute
- **Cursor**: Generates `.cursorrules` context + task prompt for Composer
- **GitHub Issues**: Creates issues with labels, assignees, and linked codebase references
- **Linear**: Creates Linear issues via API with proper project/cycle assignment
- **Codex**: Generates task prompt with repo context for OpenAI Codex
- **Copy Markdown**: Plain markdown for any tool

---

## Step 6: The Continuous Loop (Day 2+)

After the initial "aha," the product becomes a persistent intelligence layer.

### 6a: Connect Live Sources

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Feedback Sources                     [ + Add ]    │
│                                                     │
│   ✓ Intercom     1,247 items    Syncing live        │
│   ✓ Slack #feedback  389 items  Syncing live        │
│   ✓ GitHub Issues    156 items  Syncing live        │
│   ○ Zendesk      Not connected                      │
│   ○ App Store    Not connected                      │
│   ○ PostHog      Not connected                      │
│                                                     │
│   Manual imports:                                   │
│   ✓ Q4 user interviews.csv       234 items          │
│   ✓ NPS survey Dec 2025.csv      567 items          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Integrations sync continuously. New feedback is classified and merged into existing themes in real-time. Themes grow, new ones emerge, urgency shifts.

### 6b: Living Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Product Intelligence Dashboard            Last updated: 2m ago │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  2,593 feedback items  •  14 themes  •  3 repos connected       │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ TRENDING UP │  │ NEW THIS    │  │ SHIPPED     │             │
│  │             │  │ WEEK        │  │             │             │
│  │ Auth issues │  │ API rate    │  │ Dark mode   │             │
│  │ +23 in 7d   │  │ limiting    │  │ Resolved 89 │             │
│  │             │  │ 12 mentions │  │ complaints  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  PRIORITY MATRIX                                                │
│                                                                  │
│  High Impact ┌────────────────────────────────────┐             │
│              │  ★ Auth fix     │  API perf        │             │
│              │  142 mentions   │  89 mentions      │             │
│              ├─────────────────┼──────────────────│             │
│              │  Bulk export    │  Dashboard UX    │             │
│              │  67 mentions    │  43 mentions      │             │
│  Low Impact  └────────────────────────────────────┘             │
│              Low Effort                    High Effort           │
│                                                                  │
│  RECENTLY SHIPPED → CUSTOMER IMPACT                             │
│  ✓ Dark mode (shipped Feb 18) → 89 complaints resolved          │
│    "Finally! This was driving me crazy" — 12 positive follow-ups│
│  ✓ CSV export (shipped Feb 12) → 34 complaints resolved        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6c: Close the Loop

When a feature ships (detected via merged PR or manual mark), the system:
1. Matches the shipped feature to the original feedback theme
2. Shows how many customer complaints this resolves
3. Optionally drafts a changelog entry / notification to affected customers
4. Updates the priority matrix (resolved themes drop off, remaining ones shift)

```
Feature shipped: Dark Mode (PR #847 merged)

Resolves:
  → 89 feedback items about "dark mode" / "night mode" / "eye strain"
  → 12 enterprise accounts mentioned this as important

Suggested actions:
  [ Draft changelog entry ]
  [ Notify affected customers via Intercom ]
  [ Mark as resolved ]
```

---

## Step 7: Team Adoption (Week 2+)

### Invite the Team

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Invite your team                                   │
│                                                     │
│  PMs see:     Themes, evidence, priority matrix     │
│  Engineers:   Code-aware specs, agent export         │
│  Leadership:  Impact dashboard, shipped features     │
│                                                     │
│  [ Invite by email ]  [ Copy invite link ]          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Weekly Digest

Automated email/Slack digest:

```
This week in your product intelligence:

  📈 Trending: "API rate limiting" (+45 mentions)
  🆕 New theme: "Webhook reliability" (23 mentions)
  ✅ Shipped: Dark mode resolved 89 complaints
  🎯 Suggested next: Fix Auth (142 mentions, $48K ARR at risk)

  [Open Dashboard]
```

---

## Full Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER LAYER                                │
│                                                                     │
│   Web Dashboard        CLI (optional)        Slack/Email Digests    │
│   - Themes view        - locus analyze       - Weekly summary       │
│   - Code proposals     - locus export        - New theme alerts     │
│   - Agent export       - locus status        - Ship notifications   │
│   - Priority matrix                                                 │
└───────────────┬─────────────────────────────────────┬───────────────┘
                │                                     │
┌───────────────▼─────────────────────────────────────▼───────────────┐
│                         API LAYER (NestJS)                          │
│                                                                     │
│   /feedback      /themes       /proposals     /export     /repos    │
│   - Ingest       - List        - Generate     - Claude    - Connect │
│   - Classify     - Detail      - Edit         - Cursor    - Index   │
│   - Deduplicate  - Trending    - Approve      - Linear    - Status  │
│                                               - GitHub              │
└───────────┬──────────┬──────────┬─────────────────┬─────────────────┘
            │          │          │                 │
┌───────────▼──┐ ┌─────▼────┐ ┌──▼───────────┐ ┌──▼──────────────┐
│  INGESTION   │ │ SYNTHESIS│ │ CODE MAPPING  │ │ INTEGRATIONS    │
│  ENGINE      │ │ ENGINE   │ │ ENGINE        │ │                 │
│              │ │          │ │               │ │ IN:             │
│ Classifies   │ │ Clusters │ │ Repo index    │ │ - Intercom      │
│ feedback     │ │ themes   │ │ + AI maps     │ │ - Slack         │
│ items by     │ │ from raw │ │ features to   │ │ - Zendesk       │
│ intent,      │ │ items,   │ │ files, APIs,  │ │ - GitHub Issues │
│ urgency,     │ │ ranks by │ │ schemas, and  │ │ - App Store     │
│ sentiment    │ │ impact   │ │ components    │ │ - PostHog       │
│              │ │          │ │               │ │ - CSV/JSON      │
│              │ │          │ │               │ │                 │
│              │ │          │ │               │ │ OUT:            │
│              │ │          │ │               │ │ - Claude Code   │
│              │ │          │ │               │ │ - Cursor        │
│              │ │          │ │               │ │ - Linear        │
│              │ │          │ │               │ │ - GitHub Issues │
│              │ │          │ │               │ │ - Codex         │
└──────────────┘ └──────────┘ └───────────────┘ └─────────────────┘
                                     │
                              ┌──────▼──────┐
                              │  REPO INDEX │
                              │             │
                              │ File tree   │
                              │ Route map   │
                              │ DB schema   │
                              │ Components  │
                              │ API surface │
                              └─────────────┘
```

---

## Data Model (New/Modified Entities)

```
FeedbackSource          FeedbackItem             Theme
─────────────           ────────────             ─────
id                      id                       id
workspaceId             sourceId                 workspaceId
type (intercom,         rawText                  title
  slack, csv, etc)      classifiedIntent         description
config (API keys,       sentiment                mentionCount
  webhook URLs)         urgency                  urgencyScore
status                  deduplicatedTo?          revenueImpact
lastSyncAt              themeId                  status (active,
itemCount               customerRef                shipped, dismissed)
createdAt               createdAt                shippedAt
                                                 createdAt

Proposal                ProposalTask             RepoIndex
────────                ────────────             ─────────
id                      id                       id
themeId                 proposalId               workspaceId
workspaceId             title                    repoUrl
repoIndexId             description              indexData (JSON)
title                   acceptanceCriteria       fileCount
evidence (quotes)       affectedFiles[]          routeCount
affectedFiles[]         complexity               schemaModels
estimatedScope          priority                 lastIndexedAt
status (draft,          order                    createdAt
  approved, exported)   exportedTo?
createdAt               createdAt
```

---

## What Gets Reused from Locus

| Existing | Becomes |
|----------|---------|
| `apps/api/` (NestJS, auth, workspaces, orgs) | API backbone — auth, workspace isolation, team management |
| `apps/web/` (Next.js, dashboard, kanban, stats) | Dashboard shell — theme views replace task views, stats cards show feedback metrics |
| Multi-agent planning system | Synthesis engine — multiple AI passes for classification, clustering, ranking |
| Codebase semantic indexing | Repo index engine — already built, just needs GitHub OAuth trigger |
| Task/sprint data models | Proposal/ProposalTask models — similar structure with feedback evidence |
| Activity feed + events | Feedback activity stream — shows new themes, trend changes, shipped features |
| Onboarding tours (driver.js) | New tours for: paste feedback, connect repo, read proposals |
| Workspace setup flow | Add "Connect GitHub" and "Add feedback source" steps |
| StatCard components | Repurpose for: total feedback, active themes, shipped features, revenue impact |

---

## MVP Build Order (4-6 weeks)

### Week 1-2: Core Ingestion + Synthesis
- Feedback paste/upload (CSV, plain text)
- AI classification pipeline (intent, urgency, sentiment)
- Deduplication
- Theme clustering + ranking
- Basic web UI: paste → see themes with quotes

### Week 3: Codebase Connection
- GitHub OAuth + repo selection
- Adapt existing codebase indexer to work via GitHub API
- Code-aware proposal generation (theme → affected files/routes/schemas)
- Proposal detail view with file tree

### Week 4: Agent Export
- Export to Claude Code (markdown task file + context)
- Export to Cursor (rules + composer prompt)
- Export to GitHub Issues
- Export to Linear (via API)
- Copy as markdown

### Week 5: Live Integrations
- Intercom webhook ingestion
- Slack channel monitoring
- GitHub Issues sync
- Continuous re-synthesis as new feedback arrives

### Week 6: Polish + Ship
- Priority matrix visualization
- Weekly digest emails
- "Shipped" detection (PR merge → resolve theme)
- Landing page + demo mode
- Public launch

---

## The YC Demo Script (2 minutes)

> "Every team has hundreds of customer complaints they never read. We turn them into code."
>
> *[Paste 500 app store reviews]*
>
> "In 15 seconds, we found 8 themes. Auth is broken — 142 people said so. Here are their exact words."
>
> *[Click 'Connect Repo']*
>
> "Now watch. We know your codebase. Auth issues? That's oauth-provider.ts, session-manager.ts, and you need a SAML provider. Here's the schema migration."
>
> *[Click 'Generate Agent Tasks']*
>
> "Three tasks. Each one has the customer evidence, the affected files, and acceptance criteria. Click export, and Claude Code executes them."
>
> *[Click 'Claude Code' export]*
>
> "From 500 angry reviews to a merged PR. That's what we do."

---

## Metrics to Track (Prove Impact)

- **Time from feedback to shipped feature** (target: 10x faster than manual)
- **Feedback items analyzed** (shows scale no human can match)
- **Themes discovered that team didn't know about** (the "hidden insight" metric)
- **Tasks exported to agents** (proves the agent bridge works)
- **Features shipped from proposals** (closes the loop)
- **Revenue impact of shipped features** (the number that sells to leadership)
