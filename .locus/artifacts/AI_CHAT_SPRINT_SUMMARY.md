# AI Chat Optimization Sprint - Quick Reference

**Project**: Locus AI SDK v0.7.3+
**Created**: 2026-01-31
**Sprint Duration**: 1 Month (4 weeks, 20 working days)

---

## Overview

Transform the AI Chat from a **forced interview system** to a **flexible, continuous learning conversation** that builds project context progressively across all interactions.

---

## The Problem

1. Users must complete project manifest before accessing features
2. Can't explore technology options or do planning without full project details
3. Interview feels like form-filling, not conversation
4. No way to say "I don't know yet" and still get value
5. Intent classification misses ~20% of queries

---

## The Solution

### Core Changes

1. **Flexible Entry Points**: Add 5 new intents (EXPLORE_TECH, COMPARE_OPTIONS, SEEK_ADVICE, HELP, PROVIDE_CONTEXT)
2. **Progressive Manifest Building**: Extract project info from ALL conversations, not just interview
3. **Just-in-Time Questions**: Ask only relevant questions when needed for current task
4. **Conversational Interview**: Natural dialogue instead of form-filling
5. **Uncertainty Handling**: "I don't know yet" → Exploration, not blocker

---

## Week-by-Week Summary

### Week 1: Intent System Redesign
**Goal**: Flexible entry points

| Days | Task | Deliverable |
|------|------|-------------|
| 1-2 | Add 5 new intent types | Updated intent enum + classification |
| 3-4 | Create workflows for new intents | 5 new workflow handlers |
| 5 | Improve classification accuracy | 95%+ accuracy, <300ms latency |

**Key Metrics**:
- 13 intents (up from 8)
- 95%+ classification accuracy
- 40%+ handled by pattern matching (fast path)

---

### Week 2: Progressive Manifest Building
**Goal**: Continuous context gathering

| Days | Task | Deliverable |
|------|------|-------------|
| 6-7 | Background manifest enrichment | ManifestEnricher class |
| 8-9 | Remove forced interview mode | Optional, on-demand interview |
| 10 | Partial manifest handling | All workflows work with incomplete data |

**Key Metrics**:
- 85% manifest completion rate (organic, not forced)
- Time to first value: <30 seconds (down from ~5 minutes)
- Background enrichment extracts info from 90%+ conversations

---

### Week 3: Smart Interviewing
**Goal**: Just-in-time questions

| Days | Task | Deliverable |
|------|------|-------------|
| 11-12 | JIT question system | Context-aware interviewing |
| 13-14 | Conversational interview flow | Natural dialogue, multi-field extraction |
| 15 | "I don't know" handling | Exploration prompts, uncertainty flags |

**Key Metrics**:
- Interview completion rate: 85%+ (up from ~60%)
- Questions only when relevant (30% reduction in questions asked)
- User satisfaction: 4.5+/5.0

---

### Week 4: Polish & Launch
**Goal**: Production-ready

| Days | Task | Deliverable |
|------|------|-------------|
| 16-17 | Performance optimization | <300ms intent detection, caching |
| 18-19 | Testing & QA | 90%+ coverage, E2E tests |
| 20 | Rollout & documentation | Feature flags, migration guide |

**Key Metrics**:
- 90%+ test coverage
- <300ms P95 latency
- Zero production incidents

---

## Success Metrics

| Metric | Current | Target | Change |
|--------|---------|--------|--------|
| Time to First Value | ~5 min | <30 sec | -90% |
| Manifest Completion Rate | ~60% | 85% | +42% |
| Intent Classification Accuracy | ~80% | 95% | +19% |
| User Satisfaction (Chat) | Unknown | 4.5+/5.0 | New |
| Conversations Starting with Interview | 100% | <20% | -80% |
| Avg Manifest Completeness | 45% | 75% | +67% |

---

## Key Deliverables

### Code (40 files)
- 5 new workflows + 6 new chains
- 4 new core utilities
- 10 test files
- 11 modified existing files

### Documentation (10 files)
- Sprint plan (main document)
- Task breakdown
- Migration guide
- Architecture decision record
- Testing strategy
- User guide

---

## Team & Resources

### Required Team
- 2 Backend Engineers (AI SDK + API)
- 1 Frontend Engineer (Chat UI)
- 1 QA Engineer (Testing)
- 1 Product Manager (Metrics, user research)

### Key Technologies
- LangChain (intent classification, chains)
- OpenAI GPT-4 / Anthropic Claude (LLM)
- PostgreSQL (session + manifest storage)
- Feature flags (gradual rollout)

---

## Risk Mitigation

### Top 3 Risks

1. **Intent accuracy drops**
   - Mitigation: Test dataset, A/B testing, feature flags
   - Contingency: Roll back to 8 intents

2. **Manifest enrichment false positives**
   - Mitigation: 80%+ confidence threshold, user notifications
   - Contingency: Require manual approval

3. **Users confused by no interview**
   - Mitigation: Onboarding tooltip, example questions
   - Contingency: Add optional "guided setup" mode

---

## Rollout Plan

### Phase 1: Feature Flag (Days 20-22)
- Internal team: 100%
- Beta users: 50 users
- Monitor metrics, gather feedback

### Phase 2: Gradual Release (Days 23-30)
- 10% → 25% → 50% → 100% over 2 weeks
- Daily monitoring
- Fix non-critical bugs

### Phase 3: Post-Launch (Days 31+)
- User survey
- Analyze results
- Plan iteration

---

## Quick Commands

```bash
# Development
bun run dev

# Testing
bun run test
bun run test:ai-sdk
bun run test:e2e

# Quality
bun run lint
bun run typecheck

# Build
bun run build
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `packages/ai-sdk/src/chains/intent.ts` | Intent classification |
| `packages/ai-sdk/src/core/agent.ts` | Main orchestrator |
| `packages/ai-sdk/src/core/manifest-enricher.ts` | Progressive building |
| `packages/ai-sdk/src/core/jit-interviewer.ts` | JIT questions |
| `packages/ai-sdk/src/workflows/conversational-interview.ts` | Natural interview |

---

## Communication

### Internal
- Daily standups: 15 min (9:00 AM)
- Weekly demos: Friday 4:00 PM
- Sprint retrospectives: End of each week

### External
- Week 2: Beta announcement
- Week 3: Feature preview blog
- Week 4: General release
- Week 5: User survey

### Stakeholders
- Weekly email updates (Friday)
- Mid-sprint check-in (Day 10)
- Final presentation (Day 25)

---

## Documents Created

1. **AI_CHAT_INTENT_OPTIMIZATION_1MONTH_SPRINT.md** (Main plan)
   - Complete sprint plan with detailed tasks
   - Code examples and architecture
   - Risk assessment and mitigation

2. **AI_CHAT_SPRINT_SUMMARY.md** (This document)
   - Quick reference
   - Week-by-week overview
   - Key metrics and deliverables

3. **AI_CHAT_TASK_BREAKDOWN.md** (Next)
   - Granular task list
   - File-by-file changes
   - Time estimates

---

## Next Steps

1. **Team Review**: Share documents, gather feedback
2. **Approval**: Get stakeholder buy-in
3. **Kick-off**: Week 1, Day 1
4. **Daily Execution**: Follow task breakdown
5. **Weekly Demos**: Show progress
6. **Launch**: Day 20

---

**Status**: Ready for Review
**Owner**: [Sprint Lead Name]
**Slack**: #ai-chat-optimization
**Last Updated**: 2026-01-31
