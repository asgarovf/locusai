# $0 Marketing Playbook for Locus

**Date:** 2026-02-20
**Summary:** A comprehensive, actionable marketing strategy for Locus using only free channels and tactics. Every item here costs $0 — only your time and effort.

---

## Prerequisites Before Marketing Push

Before executing any of the strategies below, address these items from the [landing page audit](./landing-page-docs-audit.md):

- [ ] Remove all references to non-existent features (`--agents`, `--auto-push`, `locus agents`, `locus login`, `locus dash`, mindmaps)
- [ ] Standardize messaging to reflect single-agent sequential execution
- [ ] Fix the desktop "Get Started" button URL
- [ ] Add a quick-start section to README that gets users running in <2 minutes without an account

**Why:** Every marketing strategy below drives traffic to your GitHub repo and website. If visitors see features that don't work, you lose credibility permanently. Fix accuracy first, market second.

---

## 1. Show HN Launch

**Priority:** HIGH — Do this first
**Effort:** 2-3 hours (post is already drafted)

The [Show HN post](./show-hn-post.md) is already drafted and reviewed for [compliance](./show-hn-compliance-review.md). Action items:

- [ ] Fix the prerequisite issues above
- [ ] Post on a **Tuesday or Wednesday between 8-10am ET** (peak HN traffic)
- [ ] Be available for **4-6 hours** after posting to respond to every comment
- [ ] Link to GitHub repo (not landing page) as the primary URL
- [ ] Lead with the no-signup CLI path in the post body

**Tips for HN success:**
- Respond to criticism constructively and honestly ("you're right, that's not implemented yet — it's on the roadmap")
- Share technical details freely — HN rewards transparency
- Don't argue with downvoters; engage with genuine questions
- If someone suggests a feature, say "great idea, I'll track it" and actually open an issue

---

## 2. Reddit Launch Strategy

**Priority:** HIGH
**Effort:** 3-4 hours across multiple subreddits

Post in these subreddits, tailored for each community's style. **Do NOT cross-post the same content** — write a unique post for each:

### r/programming (~6M members)
**Angle:** Technical architecture deep-dive
```
Title: I built an open-source AI project manager where code execution
happens locally — here's the architecture

Body: [Explain the split architecture — cloud planning, local execution.
Include a Mermaid diagram or architecture image. Focus on the technical
decisions: why TypeScript monorepo, why NestJS, why worker threads for
agent isolation, how the NDJSON streaming protocol works. End with
"GitHub link, MIT license, feedback welcome."]
```

### r/selfhosted (~500K members)
**Angle:** Self-hosting story
```
Title: Locus — self-hosted AI coding agent that plans sprints and
executes tasks on your own infrastructure

Body: [Lead with the self-hosting angle. One-command installer, runs as
a systemd service, Telegram bot for remote control from your phone.
Emphasize that code never leaves their server. Include the install
command and a screenshot of the Telegram bot in action.]
```

### r/devops (~200K members)
**Angle:** Infrastructure automation
```
Title: Open-source tool that lets AI agents autonomously execute sprint
tasks, commit code, and open PRs

Body: [Focus on the CI/CD-like workflow: plan → execute → commit → PR.
Mention provider flexibility (Claude/Codex), git automation, and the
upcoming AWS orchestration feature. DevOps people care about
infrastructure control.]
```

### r/ChatGPT / r/ClaudeAI / r/LocalLLaMA
**Angle:** AI tooling comparison
```
Title: I built an open-source project manager that lets Claude/Codex
agents plan and execute entire sprints autonomously

Body: [Focus on what makes this different from Cursor, Copilot, Devin,
etc. Key differentiator: project management + execution in one tool,
local execution, free & open source. Show a demo of `locus plan`
generating a sprint and `locus run` executing it.]
```

### r/opensource (~100K members)
**Angle:** Open-source story + contribution invite
```
Title: Locus — MIT-licensed AI project management platform. Looking for
contributors and feedback

Body: [Tell the personal story — why you built it, what problem it
solves. Explain the contribution areas: CLI, SDK, VSCode extension,
web dashboard, docs. Link to CONTRIBUTING.md and good-first-issues.]
```

**Timing:** Space posts 2-3 days apart. Don't spam them all at once. Best posting times: Tuesday-Thursday, 9-11am ET.

---

## 3. Twitter/X Content Strategy

**Priority:** HIGH
**Effort:** 30 min/day ongoing

### Launch Thread
Write a thread (8-10 tweets) structured like this:

```
Tweet 1 (Hook):
I built an open-source AI project manager that plans sprints,
executes tasks, commits code, and opens PRs — all without your
code ever leaving your machine.

Here's what it does and why I built it 🧵

Tweet 2: The problem — disconnect between planning tools and AI
code execution. You plan in Jira, code with Copilot, but nothing
connects the two.

Tweet 3: The solution — Locus. Plan in the cloud, execute locally.
Show a terminal recording of `locus plan`.

Tweet 4: Demo of `locus run` — agent picks up a task, writes code,
commits, moves to the next task.

Tweet 5: The security model — only task metadata syncs to cloud.
Your source code stays on your machine. Architecture diagram.

Tweet 6: Telegram bot — manage your agent from your phone.
Screenshot of commands.

Tweet 7: VSCode extension — chat with AI that has full repo context.

Tweet 8: It's free, open source (MIT), and self-hostable.
No usage limits, no hidden costs.

Tweet 9: Tech stack for the nerds — TypeScript monorepo, NestJS,
Next.js, Bun-bundled CLI, worker threads.

Tweet 10: Try it now: npm install -g @locusai/cli && locus init
GitHub: [link]
Docs: [link]
Star the repo if you find it useful ⭐
```

### Ongoing Content Calendar (2-3 posts/week):

| Day | Content Type | Example |
|-----|-------------|---------|
| Mon | Feature highlight | "Did you know `locus review` can analyze your full codebase, not just diffs? Here's how it catches bugs that diff-based reviewers miss..." |
| Wed | Build-in-public update | "This week I shipped [feature]. Here's what I learned about [technical challenge]..." |
| Fri | Quick tip / demo | 15-sec screen recording of a specific workflow |

### Hashtags to use:
`#buildinpublic #opensource #devtools #AI #coding #typescript`

### Accounts to engage with (reply to their posts, share insights):
- @LangChainAI, @AnthropicAI, @OpenAI
- DevTool founders (search for #buildinpublic in devtools space)
- AI coding tool accounts (@cursor_ai, @github copilot discussions)

---

## 4. Dev.to / Hashnode / Medium Articles

**Priority:** MEDIUM
**Effort:** 3-5 hours per article

Write 3-4 articles, publish one per week. Cross-post across all three platforms (Dev.to, Hashnode, Medium — all free).

### Article 1: "How I Built an AI Project Manager That Keeps Your Code Private"
- Personal story + technical architecture
- Include architecture diagrams
- Code snippets showing key design decisions
- End with CTA to try it / star the repo

### Article 2: "Building a Multi-Agent AI Planning System with Claude"
- Deep dive into the `locus plan` system
- How Tech Lead, Architect, and Sprint Organizer roles work
- Prompt engineering insights
- Code examples from the planning pipeline

### Article 3: "Autonomous AI Agents: From Sprint Plan to Pull Request in One Command"
- End-to-end walkthrough of the Locus workflow
- Screenshots and terminal recordings at each step
- Comparison to manual workflow (time savings)

### Article 4: "Self-Hosting AI Coding Agents: A Complete Guide"
- Step-by-step self-hosting tutorial
- Infrastructure requirements and costs (~$8-15/mo on AWS)
- Telegram bot setup for remote management
- Security best practices

### SEO Keywords to Target:
- "AI coding agent"
- "open source AI project management"
- "self-hosted AI agent"
- "autonomous code execution"
- "AI sprint planning"
- "Claude code agent"
- "local AI code execution"

---

## 5. YouTube / Video Content

**Priority:** MEDIUM
**Effort:** 4-6 hours per video

You don't need fancy production. A terminal recording + voiceover works great for dev tools.

### Video 1: "Locus in 5 Minutes" (Short Demo)
- Quick overview of the full workflow
- Plan → Execute → Review → Merge
- Post on YouTube, Twitter, LinkedIn

### Video 2: "Setting Up Locus: From Install to First PR" (Tutorial)
- Step-by-step walkthrough
- Installation, workspace setup, first `locus plan`, first `locus run`
- 10-15 minutes

### Video 3: "I Let an AI Agent Build My Feature" (Entertaining)
- Give the agent a real task from your backlog
- Record the entire process — planning, execution, the PR
- Review the code quality honestly
- This format does well on YouTube and Twitter

### Tools (all free):
- **Screen recording:** OBS Studio (free), or QuickTime on macOS
- **Terminal recording:** asciinema (great for sharing terminal sessions)
- **Thumbnails:** Canva free tier
- **Video editing:** DaVinci Resolve (free)

---

## 6. GitHub Optimization

**Priority:** HIGH
**Effort:** 2-3 hours one-time

Your GitHub repo IS your landing page for developers. Optimize it:

- [ ] **Add a demo GIF/video** at the top of README (terminal recording of `locus plan` → `locus run` → PR created)
- [ ] **Add badges:** npm version, license, GitHub stars, build status
- [ ] **Create "good first issue" labels** on 5-10 issues to attract contributors
- [ ] **Add GitHub Topics:** `ai`, `project-management`, `coding-agent`, `typescript`, `cli`, `open-source`, `devtools`, `ai-agent`, `sprint-planning`, `autonomous-coding`
- [ ] **Enable GitHub Discussions** for community Q&A
- [ ] **Create issue templates** for bug reports, feature requests, and integration requests
- [ ] **Add CONTRIBUTING.md** with clear contribution guidelines
- [ ] **Pin the repo** on your GitHub profile
- [ ] **Write a compelling "About" description** for the repo

### GitHub SEO:
GitHub repos rank in Google. Ensure your README contains these keywords naturally:
- "AI coding agent"
- "autonomous code execution"
- "AI project management"
- "sprint planning AI"
- "self-hosted AI agent"

---

## 7. Product Hunt Launch

**Priority:** MEDIUM
**Effort:** 4-5 hours

Product Hunt is free to launch on and can drive significant traffic.

### Preparation:
- [ ] Create a Product Hunt maker profile
- [ ] Prepare 5-6 screenshots/GIFs showing the product in action
- [ ] Write a compelling tagline (max 60 chars): "AI agents that plan sprints and ship code locally"
- [ ] Write description (under 260 chars)
- [ ] Prepare a "first comment" from the maker explaining the story
- [ ] Get 3-5 friends/colleagues to leave genuine comments on launch day

### Launch Day:
- Post at **12:01am PT** (Product Hunt resets at midnight Pacific)
- Share on Twitter, LinkedIn, Reddit with "We just launched on Product Hunt"
- Respond to every comment quickly
- **Best days:** Tuesday, Wednesday, Thursday (avoid Monday and Friday)

---

## 8. Discord / Slack Community Engagement

**Priority:** MEDIUM
**Effort:** 1-2 hours/week ongoing

Join and genuinely participate in these communities (don't just spam your link):

### Discord Servers:
- **Anthropic/Claude Discord** — Share in the "showcase" or "projects" channel
- **OpenAI Discord** — Similar showcase channel
- **Dev.to Discord** — Developer community
- **The Coding Den** — Active coding community
- **Reactiflux** (if you post about the Next.js dashboard)

### Slack Communities:
- **DevOps Chat** — Share the self-hosting angle
- **Rands Leadership** — Engineering management angle
- **Launch.chat** — Startup/indie hacker community

### Strategy:
1. Join and lurk for a week — understand the culture
2. Answer questions where your expertise applies (AI agents, TypeScript, NestJS)
3. When relevant, mention Locus naturally: "I actually built a tool that does this — [link]"
4. Share genuinely useful content, not just self-promotion
5. Create your own Discord server once you have 50+ GitHub stars for community building

---

## 9. LinkedIn Strategy

**Priority:** LOW-MEDIUM
**Effort:** 1-2 hours/week

LinkedIn works well for reaching engineering managers and team leads — your secondary audience.

### Post Types:
1. **Launch announcement** — "I've been building something for the past X months..."
2. **Technical insights** — "Here's what I learned about building multi-agent AI systems"
3. **Industry commentary** — "The AI coding tools market is missing something: project management"
4. **Milestone celebrations** — "Locus hit 100 GitHub stars" / "First community PR merged"

### Tips:
- Write in first person, be personal
- No hashtag spam (2-3 max)
- Engage with comments within the first hour (LinkedIn algorithm rewards this)
- Post between 8-10am on Tuesday-Thursday

---

## 10. Podcast Guest Appearances

**Priority:** LOW (high effort, delayed payoff)
**Effort:** 1-2 hours per appearance + outreach

Reach out to these podcasts (all accept guest pitches for free):

| Podcast | Angle | Contact |
|---------|-------|---------|
| **Changelog** | Open source AI tooling | changelog.com/request |
| **Indie Hackers** | Solo founder building AI dev tool | indiehackers.com |
| **devtools.fm** | Developer tooling deep dive | devtools.fm |
| **Console DevTools** | Weekly dev tool newsletter | console.dev |
| **PodRocket** | Web development + AI | podrocket.logrocket.com |
| **Software Engineering Daily** | Architecture deep dive | softwareengineeringdaily.com |

### Pitch Template:
```
Subject: Guest pitch — Open-source AI agent that plans and executes
entire sprints autonomously

Hi [Name],

I'm Farhad, a solo developer who built Locus — an open-source (MIT)
AI project management platform where agents plan sprints and execute
tasks locally, so your code never leaves your machine.

I think your audience would be interested in:
- The architecture behind split cloud/local execution
- How multi-agent AI planning works (Tech Lead + Architect + Sprint
  Organizer roles)
- The security model for AI coding tools
- Building a solo open-source project from scratch

Locus is on GitHub: [link]

Would love to chat if there's interest. Happy to adjust the topic
to fit your show.

Best,
Farhad
```

---

## 11. Newsletter / Directory Submissions

**Priority:** MEDIUM
**Effort:** 2-3 hours one-time

Submit Locus to these free directories and newsletters:

### Directories (Submit Once):
- [ ] **awesome-selfhosted** (GitHub) — Submit a PR to add Locus
- [ ] **awesome-ai-tools** (GitHub) — Submit a PR
- [ ] **awesome-cli-apps** (GitHub) — Submit a PR
- [ ] **awesome-devtools** (GitHub) — Submit a PR
- [ ] **AlternativeTo** — Add Locus as an alternative to Jira, Linear, Devin
- [ ] **ToolJet Alternatives** / **Open Source Alternatives** (GitHub lists)
- [ ] **Free for Dev** (GitHub) — If you offer a free hosted tier
- [ ] **console.dev** — Submit for their weekly dev tools newsletter
- [ ] **uneed.best** — Free product listing
- [ ] **microlaunch.net** — Free launch platform
- [ ] **SaaSHub** — Free listing
- [ ] **LibHunt** — Auto-indexed from GitHub
- [ ] **StackShare** — Add Locus as a tool/technology
- [ ] **OpenAlternative** — Open-source alternative directory

### Newsletters to Pitch:
- [ ] **TLDR Newsletter** — Submit to tldr.tech (they cover dev tools)
- [ ] **Changelog News** — changelog.com/news (submit via GitHub)
- [ ] **Console Newsletter** — console.dev (submit your tool)
- [ ] **Hacker Newsletter** — hackernewsletter.com (curated from HN — get on HN first)
- [ ] **DevOps Weekly** — devopsweekly.com
- [ ] **JavaScript Weekly** — javascriptweekly.com (TypeScript monorepo angle)
- [ ] **Node Weekly** — nodeweekly.com

---

## 12. SEO & Content Marketing

**Priority:** MEDIUM (long-term play)
**Effort:** Ongoing, 2-3 hours/week

### Quick Wins:
- [ ] Add JSON-LD structured data to all website pages (some are missing per audit)
- [ ] Add `<meta>` descriptions to all pages
- [ ] Create a `/blog` section on locusai.dev and cross-post your Dev.to articles
- [ ] Submit sitemap to Google Search Console (free)
- [ ] Add alt text to all images

### Long-Tail Content Ideas:
Write blog posts targeting these search queries:
- "AI coding agent comparison 2026"
- "how to use Claude for code automation"
- "self-hosted AI development tools"
- "AI sprint planning tool"
- "autonomous code execution tools"
- "Devin alternatives open source"
- "AI project management for developers"
- "Claude Code vs Cursor vs Copilot"

---

## 13. Community Building

**Priority:** MEDIUM (start after initial traction)
**Effort:** 2-3 hours/week ongoing

### Create a Locus Discord Server:
- **#announcements** — Release notes, updates
- **#general** — Community chat
- **#support** — Help with setup and issues
- **#showcase** — Users share what they built with Locus
- **#feature-requests** — Community-driven roadmap
- **#contributing** — For open-source contributors

### Create a Locus GitHub Discussion Board:
- **Announcements** — Official updates
- **Q&A** — Community support
- **Ideas** — Feature requests
- **Show & Tell** — User showcases

### Invite Early Users to Give Feedback:
- Add a "Join our Discord" badge in README
- Mention the community in HN/Reddit posts
- Offer "early adopter" role in Discord for first 50 members

---

## 14. Comparison Pages

**Priority:** MEDIUM
**Effort:** 2-3 hours per page

Create comparison pages on your website (great for SEO):

- **Locus vs Devin** — Open-source, local execution, free vs $500/mo
- **Locus vs Cursor** — Project management + execution vs just coding
- **Locus vs GitHub Copilot** — Autonomous vs suggestion-based
- **Locus vs Linear + AI** — Native AI execution vs bolt-on AI
- **Locus vs Jira + Claude** — Integrated vs separate tools

### Structure for Each:
```
# Locus vs [Competitor]

## Quick Comparison Table
| Feature | Locus | Competitor |
|---------|-------|------------|
| Price | Free / OSS | $X/mo |
| Code privacy | Local execution | Cloud-based |
| Sprint planning | AI-powered | Manual / basic AI |
| Autonomous execution | Yes | No / Limited |
| Self-hostable | Yes | No |

## Detailed Comparison
[Honest, fair comparison — don't trash competitors]

## When to Choose [Competitor]
[Show fairness — builds trust]

## When to Choose Locus
[Your strengths]
```

---

## Execution Timeline

### Week 1: Foundation
- [ ] Fix all critical accuracy issues from audit
- [ ] Optimize GitHub repo (GIF, badges, topics, issues)
- [ ] Record a 30-second terminal demo GIF
- [ ] Prepare Show HN post (already drafted)

### Week 2: Launch
- [ ] Post Show HN (Tuesday/Wednesday 8-10am ET)
- [ ] Post Twitter launch thread
- [ ] Post LinkedIn announcement
- [ ] Submit to Product Hunt

### Week 3: Content Blitz
- [ ] Post on r/programming, r/selfhosted
- [ ] Publish Article 1 on Dev.to / Hashnode / Medium
- [ ] Submit to awesome-* lists and directories
- [ ] Join Discord communities and start engaging

### Week 4: Sustain
- [ ] Post on r/devops, r/opensource, r/ClaudeAI
- [ ] Publish Article 2
- [ ] Record first YouTube video
- [ ] Pitch 2-3 podcasts
- [ ] Start comparison pages

### Ongoing (Weekly):
- 2-3 Twitter/X posts
- 1 LinkedIn post
- 1 community engagement session (Discord/Slack)
- 1 blog article per 2 weeks
- Respond to all GitHub issues/discussions within 24 hours

---

## Metrics to Track (All Free)

| Metric | Tool |
|--------|------|
| GitHub stars / forks / clones | GitHub Insights (built-in) |
| Website traffic | Vercel Analytics (free tier) or Plausible (self-hosted) |
| npm downloads | npmjs.com package page |
| Twitter impressions | Twitter Analytics (built-in) |
| Reddit post performance | Reddit post analytics |
| HN ranking | hnrankings.info |
| Referral sources | Vercel/Plausible analytics |
| VSCode extension installs | VSCode Marketplace stats |

---

## Key Messaging Framework

Use these consistently across all channels:

### One-liner:
> "Locus is an open-source AI project management platform where agents plan sprints and execute tasks locally — your code never leaves your machine."

### Three Pillars:
1. **Privacy-first** — Code never leaves your infrastructure. Only task metadata syncs to the cloud.
2. **End-to-end** — From sprint planning to pull request, AI handles the full workflow.
3. **Free & open** — MIT license, no usage limits, fully self-hostable.

### For Different Audiences:

| Audience | Message |
|----------|---------|
| Security-conscious devs | "Your source code never leaves your machine. AI agents run locally." |
| AI enthusiasts | "Give Claude or Codex an entire sprint and watch it ship code autonomously." |
| Engineering managers | "AI-powered sprint planning with structured task breakdown, complexity estimates, and risk assessments." |
| Open-source community | "MIT licensed, self-hostable, free forever. Built by a solo dev, open to contributors." |
| Self-hosters | "One-command install. Runs as a system service. Manage from Telegram on your phone." |

---

## What NOT to Do

- **Don't spam** — Genuine engagement > volume. One thoughtful post > 10 copy-paste links
- **Don't lie about features** — Fix the accuracy issues first. Honesty builds trust
- **Don't argue with critics** — Thank them for feedback, iterate, come back stronger
- **Don't buy fake stars/followers** — GitHub and Twitter detect this; it destroys credibility
- **Don't post and ghost** — Respond to every comment, especially on HN and Reddit
- **Don't compare unfairly** — Acknowledge competitor strengths. Developers see through FUD
- **Don't over-promise** — "We're early alpha" is more trustworthy than "we do everything"
