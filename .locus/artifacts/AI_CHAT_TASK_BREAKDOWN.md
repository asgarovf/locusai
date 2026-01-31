# AI Chat Optimization - Detailed Task Breakdown

**Project**: Locus AI SDK v0.7.3+
**Created**: 2026-01-31
**Total Tasks**: 67
**Total Estimated Time**: 20 days (4 weeks)

---

## Week 1: Intent System Redesign (Days 1-5)

### Day 1: Add New Intent Types (Part 1)

#### Task 1.1: Update Intent Enum
**File**: `packages/ai-sdk/src/interfaces/index.ts`
**Time**: 15 min
**Description**: Add 5 new intents to enum

```typescript
// Add after existing intents:
EXPLORE_TECH = "EXPLORE_TECH",
COMPARE_OPTIONS = "COMPARE_OPTIONS",
SEEK_ADVICE = "SEEK_ADVICE",
HELP = "HELP",
PROVIDE_CONTEXT = "PROVIDE_CONTEXT",
```

**Acceptance**: Enum compiles, no TypeScript errors

---

#### Task 1.2: Update Intent Classification Prompt
**File**: `packages/ai-sdk/src/chains/intent.ts`
**Time**: 2 hours
**Description**: Expand prompt with examples for new intents

**Changes**:
- Add 3 examples per new intent (15 total)
- Update decision tree logic
- Add confidence scoring for each intent

**Acceptance**: Prompt clearly distinguishes all 13 intents

---

#### Task 1.3: Add Intent Pattern Matching
**File**: `packages/ai-sdk/src/utils/intent-patterns.ts` (new)
**Time**: 1 hour
**Description**: Create fast-path pattern matching

```typescript
export const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  [Intent.HELP]: [/^(help|what can you)/i],
  [Intent.EXPLORE_TECH]: [/^(what|which|best) (framework|library)/i],
  // ... etc
};

export function quickMatchIntent(message: string): Intent | null;
```

**Acceptance**: Pattern matching works for 20+ test cases

---

### Day 2: Add New Intent Types (Part 2)

#### Task 2.1: Update Intent Detection Chain
**File**: `packages/ai-sdk/src/chains/intent.ts`
**Time**: 2 hours
**Description**: Add multi-intent support and clarification

```typescript
interface IntentClassificationResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
  alternativeIntents?: Array<{ intent: Intent; confidence: number }>;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}
```

**Acceptance**: Returns alternative intents when confidence <80%

---

#### Task 2.2: Integrate Pattern Matching
**File**: `packages/ai-sdk/src/core/engine.ts`
**Time**: 1 hour
**Description**: Check patterns before LLM call

**Logic**:
1. Try pattern matching first (0-10ms)
2. If match with >90% confidence → return
3. Otherwise → call LLM

**Acceptance**: 40%+ of test queries handled by patterns

---

#### Task 2.3: Add Clarification Flow
**File**: `packages/ai-sdk/src/core/engine.ts`
**Time**: 1.5 hours
**Description**: Handle low-confidence classifications

**Logic**:
- If confidence <60% → ask clarifying question
- Store pending execution state
- Resume after clarification

**Acceptance**: Clarification questions make sense

---

### Day 3: Create EXPLORE_TECH Workflow

#### Task 3.1: Create Workflow File
**File**: `packages/ai-sdk/src/workflows/explore-tech.ts` (new)
**Time**: 2 hours
**Description**: Implement tech exploration workflow

**Features**:
- Provide pros/cons comparison
- Use case fit analysis
- Learning curve assessment
- Passive manifest update

**Acceptance**: Returns structured comparison for tech queries

---

#### Task 3.2: Create Chain File
**File**: `packages/ai-sdk/src/chains/explore-tech.ts` (new)
**Time**: 1.5 hours
**Description**: LLM chain for tech exploration

**Output Format**:
```typescript
{
  technology: string;
  pros: string[];
  cons: string[];
  useCaseFit: "excellent" | "good" | "fair" | "poor";
  learningCurve: "easy" | "moderate" | "steep";
  recommendation: string;
  alternatives: string[];
}
```

**Acceptance**: Returns helpful tech advice

---

#### Task 3.3: Register Workflow
**File**: `packages/ai-sdk/src/core/engine.ts`
**Time**: 15 min
**Description**: Add ExploreTechWorkflow to registry

**Acceptance**: Workflow triggers on EXPLORE_TECH intent

---

### Day 4: Create Remaining Workflows

#### Task 4.1: COMPARE_OPTIONS Workflow
**Files**:
- `packages/ai-sdk/src/workflows/compare-options.ts` (new)
- `packages/ai-sdk/src/chains/compare-options.ts` (new)
**Time**: 2 hours
**Description**: Side-by-side comparison of options

**Output**: Comparison table with recommendation

**Acceptance**: Compares 2-4 options accurately

---

#### Task 4.2: SEEK_ADVICE Workflow
**Files**:
- `packages/ai-sdk/src/workflows/seek-advice.ts` (new)
- `packages/ai-sdk/src/chains/seek-advice.ts` (new)
**Time**: 2 hours
**Description**: Architecture/approach recommendations

**Output**: Advice with trade-offs, best practices, contextual questions

**Acceptance**: Provides actionable advice

---

#### Task 4.3: HELP Workflow
**Files**:
- `packages/ai-sdk/src/workflows/help.ts` (new)
- `packages/ai-sdk/src/chains/help.ts` (new)
**Time**: 1.5 hours
**Description**: Show AI capabilities based on project state

**Output**: Categorized list of what AI can do, suggested next actions

**Acceptance**: Shows relevant capabilities for project state

---

#### Task 4.4: PROVIDE_CONTEXT Workflow
**Files**:
- `packages/ai-sdk/src/workflows/provide-context.ts` (new)
- `packages/ai-sdk/src/chains/provide-context.ts` (new)
**Time**: 1.5 hours
**Description**: Explicitly update manifest from user input

**Output**: Updated manifest, acknowledgment, suggestions for more info

**Acceptance**: Correctly extracts and updates manifest fields

---

### Day 5: Performance Optimization

#### Task 5.1: Add Intent Caching
**File**: `packages/ai-sdk/src/utils/intent-cache.ts` (new)
**Time**: 1.5 hours
**Description**: LRU cache for intent detection

**Features**:
- Hash user messages (fuzzy matching)
- 100-item LRU cache
- TTL: 1 hour

**Acceptance**: Cache hit rate >30% on repeated queries

---

#### Task 5.2: Switch to Faster Model
**File**: `packages/ai-sdk/src/chains/intent.ts`
**Time**: 30 min
**Description**: Use GPT-3.5-turbo or Claude Haiku for intent

**Change**: `model: "gpt-3.5-turbo"` (instead of gpt-4)

**Acceptance**: Latency <300ms, accuracy >90%

---

#### Task 5.3: Add Performance Monitoring
**File**: `packages/ai-sdk/src/core/engine.ts`
**Time**: 1 hour
**Description**: Log intent detection latency

**Metrics**:
- Pattern match time
- LLM call time
- Cache hit/miss ratio

**Acceptance**: Metrics logged to Sentry/Datadog

---

## Week 2: Progressive Manifest Building (Days 6-10)

### Day 6: Manifest Enrichment (Part 1)

#### Task 6.1: Create ManifestEnricher Class
**File**: `packages/ai-sdk/src/core/manifest-enricher.ts` (new)
**Time**: 3 hours
**Description**: Extract project info from conversations

**Methods**:
- `enrichFromConversation()`: Extract updates
- `shouldAutoApply()`: Check confidence threshold
- `generateSuggestion()`: Format for user confirmation

**Acceptance**: Extracts 5+ manifest fields from sample conversations

---

#### Task 6.2: Create Enrichment Chain
**File**: `packages/ai-sdk/src/chains/manifest-enrichment.ts` (new)
**Time**: 2 hours
**Description**: LLM chain for information extraction

**Output**:
```typescript
{
  updates: Partial<ProjectManifest>;
  uncertainFields: string[];
  confidence: number;
  reasoning: string;
}
```

**Acceptance**: Correctly extracts info with high confidence

---

### Day 7: Manifest Enrichment (Part 2)

#### Task 7.1: Integrate Enricher into Agent
**File**: `packages/ai-sdk/src/core/agent.ts`
**Time**: 2 hours
**Description**: Add post-execution enrichment hook

**Logic**:
1. Execute workflow → get response
2. Run enrichment in parallel
3. If confidence >80% → auto-apply + notify
4. If confidence 60-80% → suggest to user
5. If confidence <60% → ignore

**Acceptance**: Enrichment runs after every message

---

#### Task 7.2: Add Enrichment Result Types
**File**: `packages/ai-sdk/src/interfaces/index.ts`
**Time**: 30 min
**Description**: Type definitions for enrichment

```typescript
export interface ManifestEnrichmentResult {
  updates: Partial<ProjectManifest>;
  uncertainFields: (keyof ProjectManifest)[];
  confidence: number;
  reasoning: string;
}

export interface EnrichmentNotification {
  type: "auto_applied" | "suggested" | "ignored";
  field: keyof ProjectManifest;
  value: any;
  confidence: number;
}
```

**Acceptance**: Types compile correctly

---

#### Task 7.3: Add Frontend Notification UI
**File**: `apps/web/src/components/chat/EnrichmentNotification.tsx` (new)
**Time**: 2 hours
**Description**: Show enrichment updates to user

**Features**:
- Toast notification for auto-applied updates
- Inline suggestion for 60-80% confidence
- Undo button (30 sec timeout)

**Acceptance**: User sees and can interact with enrichment updates

---

### Day 8: Remove Forced Interview (Part 1)

#### Task 8.1: Change Agent Initialization
**File**: `packages/ai-sdk/src/core/agent.ts`
**Time**: 30 min
**Description**: Start in ACTIVE mode instead of INTERVIEW

```typescript
// BEFORE:
mode: AgentMode.INTERVIEW

// AFTER:
mode: AgentMode.ACTIVE
```

**Acceptance**: New sessions start in ACTIVE mode

---

#### Task 8.2: Update Interview Workflow Trigger
**File**: `packages/ai-sdk/src/workflows/interview.ts`
**Time**: 1 hour
**Description**: Only trigger on explicit intent

```typescript
// BEFORE:
canHandle(context: AgentContext): boolean {
  return context.intent === Intent.INTERVIEW ||
         (context.state.mode === AgentMode.INTERVIEW && context.intent === Intent.UNKNOWN);
}

// AFTER:
canHandle(context: AgentContext): boolean {
  return context.intent === Intent.INTERVIEW ||
         context.intent === Intent.PROVIDE_CONTEXT;
}
```

**Acceptance**: Interview only triggers when user wants it

---

#### Task 8.3: Add Contextual Interview Suggestions
**File**: `packages/ai-sdk/src/workflows/query.ts` (and others)
**Time**: 1.5 hours
**Description**: Suggest "Tell me about your project" when completeness <30%

**Logic**:
```typescript
if (context.manifest.completenessScore < 30) {
  suggestedActions.push({
    label: "Tell me about my project",
    type: "chat_suggestion",
    payload: { text: "Let me tell you about my project" }
  });
}
```

**Acceptance**: Suggestions appear when manifest is incomplete

---

### Day 9: Remove Forced Interview (Part 2)

#### Task 9.1: Add Manifest Completeness Indicator
**File**: `apps/web/src/components/chat/ManifestCompleteness.tsx` (new)
**Time**: 2 hours
**Description**: Show project context level in UI

**Features**:
- Progress bar (0-100%)
- Missing fields list
- "Complete project profile" button

**Acceptance**: User sees current completeness score

---

#### Task 9.2: Update Chat Store
**File**: `apps/web/src/stores/chat-store.ts`
**Time**: 1 hour
**Description**: Track manifest completeness in frontend state

**Fields**:
```typescript
{
  manifest: ProjectManifest | null;
  completenessScore: number;
  missingFields: string[];
}
```

**Acceptance**: Frontend state syncs with backend

---

#### Task 9.3: Add "Skip Interview" Option
**File**: `apps/web/src/components/chat/ChatOnboarding.tsx`
**Time**: 1 hour
**Description**: Let users skip interview entirely

**UI**: Modal with "Complete project profile" or "Explore features first"

**Acceptance**: Users can skip and still use all features

---

### Day 10: Partial Manifest Handling

#### Task 10.1: Audit Workflow Requirements
**File**: `packages/ai-sdk/src/config/workflow-requirements.ts` (new)
**Time**: 2 hours
**Description**: Define required fields per workflow

```typescript
export const WORKFLOW_REQUIREMENTS: Record<Intent, {
  critical: (keyof ProjectManifest)[];
  helpful: (keyof ProjectManifest)[];
  optional: (keyof ProjectManifest)[];
}> = {
  [Intent.COMPILING]: {
    critical: ["features", "techStack"],
    helpful: ["timeline", "phase"],
    optional: ["brandVoice", "competitors"]
  },
  // ... etc
};
```

**Acceptance**: All workflows have requirements defined

---

#### Task 10.2: Add Missing Field Checks
**Files**: All workflow files
**Time**: 3 hours
**Description**: Check for required fields at workflow start

**Pattern**:
```typescript
const missing = requirements.critical.filter(field =>
  !manifest[field] || manifest[field].length === 0
);

if (missing.length > 0) {
  // Ask inline or proceed with assumptions
}
```

**Acceptance**: No workflow crashes on missing data

---

#### Task 10.3: Implement Graceful Degradation
**Files**: All workflow files
**Time**: 2 hours
**Description**: Provide generic responses when info missing

**Example**: "Creating sprint plan based on what I know. This plan assumes a web application. Tell me more for better accuracy."

**Acceptance**: All workflows provide value even with minimal manifest

---

## Week 3: Smart Interviewing (Days 11-15)

### Day 11: JIT Question System (Part 1)

#### Task 11.1: Create JustInTimeInterviewer Class
**File**: `packages/ai-sdk/src/core/jit-interviewer.ts` (new)
**Time**: 3 hours
**Description**: Context-aware question decision logic

**Methods**:
- `shouldAskForInfo()`: Decide if question needed
- `generateQuestion()`: Create contextual question
- `scheduleQuestion()`: Don't ask multiple per response

**Acceptance**: Only asks relevant questions when needed

---

#### Task 11.2: Define Field Urgency Matrix
**File**: `packages/ai-sdk/src/config/workflow-requirements.ts`
**Time**: 1 hour
**Description**: Add urgency levels to requirements

```typescript
{
  [Intent.COMPILING]: {
    critical: ["features", "techStack"],  // Must have
    helpful: ["timeline", "phase"],       // Nice to have
    optional: ["brandVoice"]              // Don't ask
  }
}
```

**Acceptance**: Clear urgency levels for all fields

---

### Day 12: JIT Question System (Part 2)

#### Task 12.1: Integrate JIT into Workflows
**Files**: All workflow files
**Time**: 3 hours
**Description**: Call JIT interviewer before execution

**Pattern**:
```typescript
const jitQuestion = jitInterviewer.shouldAskForInfo(
  this.intent,
  context.manifest,
  context.input
);

if (jitQuestion?.urgency === "critical") {
  return { content: jitQuestion.question, ... };
}
```

**Acceptance**: Workflows ask JIT questions appropriately

---

#### Task 12.2: Add Question Templates
**File**: `packages/ai-sdk/src/core/jit-interviewer.ts`
**Time**: 2 hours
**Description**: Contextual question templates per field

**Examples**:
- `techStack` + COMPILING: "To create an accurate sprint plan, what's your tech stack?"
- `features` + TECHNICAL_DOCUMENTING: "What features should I include in the architecture diagram?"

**Acceptance**: Questions are contextual and natural

---

### Day 13: Conversational Interview (Part 1)

#### Task 13.1: Create Conversational Interview Chain
**File**: `packages/ai-sdk/src/chains/conversational-interview.ts` (new)
**Time**: 3 hours
**Description**: Natural dialogue-based interview

**Features**:
- Open-ended starter question
- Multi-field extraction from single response
- Acknowledgment and validation
- Follow-up questions based on previous answer

**Acceptance**: Feels like conversation, not form

---

#### Task 13.2: Add Multi-Field Extraction
**File**: `packages/ai-sdk/src/chains/conversational-interview.ts`
**Time**: 2 hours
**Description**: Extract multiple manifest fields from one response

**Example**:
User: "A task management app for remote teams using React and Node.js"
Extracted:
- mission: "task management for remote teams"
- techStack: ["React", "Node.js"]
- targetUsers: ["remote teams"]

**Acceptance**: Correctly extracts 3+ fields from single response

---

### Day 14: Conversational Interview (Part 2)

#### Task 14.1: Add Follow-Up Question Generator
**File**: `packages/ai-sdk/src/chains/conversational-interview.ts`
**Time**: 2 hours
**Description**: Generate contextual follow-ups

**Logic**: Base next question on previous answer content

**Example**:
User mentions "task management" → AI asks "What makes your approach different from Asana/Linear?"

**Acceptance**: Follow-ups are relevant and natural

---

#### Task 14.2: Add Transition Suggestions
**File**: `packages/ai-sdk/src/workflows/conversational-interview.ts`
**Time**: 2 hours
**Description**: Suggest what user can do next when interview is "good enough"

**Output**:
```typescript
{
  suggestedTransitions: [
    { label: "Create technical documentation", intent: Intent.TECHNICAL_DOCUMENTING },
    { label: "Plan MVP sprint", intent: Intent.COMPILING },
    { label: "Design database schema", intent: Intent.TECHNICAL_DOCUMENTING }
  ]
}
```

**Acceptance**: Suggests 3-5 relevant next steps

---

#### Task 14.3: Update Interview Workflow
**File**: `packages/ai-sdk/src/workflows/interview.ts`
**Time**: 1 hour
**Description**: Use new conversational chain instead of old one

**Acceptance**: Interview uses conversational approach

---

### Day 15: "I Don't Know Yet" Handling

#### Task 15.1: Add Uncertainty Detection
**File**: `packages/ai-sdk/src/chains/conversational-interview.ts`
**Time**: 2 hours
**Description**: Detect when user is uncertain

**Patterns**:
- "I don't know"
- "Not sure yet"
- "Still figuring that out"
- "Haven't decided"

**Acceptance**: Detects uncertainty >90% of time

---

#### Task 15.2: Create Exploration Prompts
**File**: `packages/ai-sdk/src/config/exploration-prompts.ts` (new)
**Time**: 2 hours
**Description**: Field-specific exploration prompts

**Examples**:
- `techStack`: "Let's explore tech options! What are your priorities?"
- `mission`: "No worries! Let's brainstorm. What problem are you solving?"

**Acceptance**: Each field has helpful exploration prompt

---

#### Task 15.3: Add Uncertainty Flags to Manifest
**File**: `packages/ai-sdk/src/interfaces/index.ts`
**Time**: 1 hour
**Description**: Track uncertain fields

```typescript
export interface ProjectManifest {
  // ... existing fields
  _uncertainFields?: (keyof ProjectManifest)[];
}
```

**Acceptance**: Uncertain fields tracked in manifest

---

## Week 4: Polish & Launch (Days 16-20)

### Day 16-17: Testing

#### Task 16.1: Unit Tests for Intent Classification
**File**: `packages/ai-sdk/src/chains/__tests__/intent.test.ts` (new)
**Time**: 3 hours
**Description**: Test all 13 intents

**Coverage**:
- 5 test cases per intent (65 total)
- Ambiguous queries
- Pattern matching
- Multi-intent results

**Acceptance**: 100% of tests pass

---

#### Task 16.2: Integration Tests for Workflows
**Files**: `packages/ai-sdk/src/workflows/__tests__/*.test.ts` (new, 5 files)
**Time**: 4 hours
**Description**: Test new workflows end-to-end

**Coverage**:
- EXPLORE_TECH, COMPARE_OPTIONS, SEEK_ADVICE, HELP, PROVIDE_CONTEXT
- 6 test cases per workflow (30 total)

**Acceptance**: All workflows behave correctly

---

#### Task 16.3: Progressive Manifest Tests
**File**: `packages/ai-sdk/src/__tests__/progressive-manifest.test.ts` (new)
**Time**: 2 hours
**Description**: Test manifest enrichment

**Coverage**:
- Auto-apply (high confidence)
- Suggest (medium confidence)
- Ignore (low confidence)
- False positive rate

**Acceptance**: Enrichment works as expected

---

#### Task 17.1: E2E Tests
**File**: `apps/web/src/__tests__/e2e/chat-flow.test.ts` (new)
**Time**: 4 hours
**Description**: Test entire chat flow

**Scenarios**:
- Start without interview
- Ask tech question → get response
- Manifest builds organically
- Explicit interview trigger
- Completeness indicator updates

**Acceptance**: All flows work end-to-end

---

#### Task 17.2: Performance Testing
**File**: `packages/ai-sdk/src/__tests__/performance.test.ts` (new)
**Time**: 2 hours
**Description**: Benchmark latency

**Metrics**:
- Intent detection <300ms (P95)
- Pattern matching <10ms
- Cache hit rate >30%

**Acceptance**: Performance targets met

---

### Day 18-19: Documentation

#### Task 18.1: Write Migration Guide
**File**: `.locus/artifacts/AI_CHAT_MIGRATION_GUIDE.md` (new)
**Time**: 2 hours
**Description**: Guide for developers

**Sections**:
- Breaking changes
- New features
- Migration steps
- Rollback procedure

**Acceptance**: Clear, actionable guide

---

#### Task 18.2: Write Architecture ADR
**File**: `.locus/artifacts/AI_CHAT_ARCHITECTURE_ADR.md` (new)
**Time**: 2 hours
**Description**: Document architectural decisions

**Sections**:
- Context (why change was needed)
- Decision (what we chose)
- Consequences (trade-offs)
- Alternatives considered

**Acceptance**: Thorough ADR

---

#### Task 18.3: Update Codebase Documentation
**Files**:
- `packages/ai-sdk/README.md`
- `packages/ai-sdk/CHANGELOG.md`
- `apps/web/docs/ai-chat-improvements.md`
**Time**: 3 hours
**Description**: Update all relevant docs

**Acceptance**: Docs reflect new system

---

### Day 20: Rollout

#### Task 20.1: Configure Feature Flags
**File**: `apps/api/src/config/feature-flags.ts`
**Time**: 1 hour
**Description**: Add flags for gradual rollout

```typescript
export const features = {
  PROGRESSIVE_INTERVIEW: process.env.ENABLE_PROGRESSIVE_INTERVIEW === "true",
  NEW_INTENTS: process.env.ENABLE_NEW_INTENTS === "true",
  CONVERSATIONAL_INTERVIEW: process.env.ENABLE_CONVERSATIONAL_INTERVIEW === "true",
};
```

**Acceptance**: Flags work correctly

---

#### Task 20.2: Deploy to Production
**Time**: 2 hours
**Description**: Deploy with feature flags disabled

**Steps**:
1. Deploy to staging → test
2. Deploy to production
3. Enable for internal team (100%)
4. Monitor for 2 hours

**Acceptance**: No errors, stable system

---

#### Task 20.3: Enable for Beta Users
**Time**: 2 hours
**Description**: Gradual rollout to 50 beta users

**Steps**:
1. Enable flags for beta cohort
2. Send announcement email
3. Monitor metrics
4. Gather feedback

**Acceptance**: Beta users using new system successfully

---

#### Task 20.4: Set Up Monitoring
**Tools**: Sentry, Datadog, or similar
**Time**: 2 hours
**Description**: Add alerts for key metrics

**Alerts**:
- Intent classification latency >500ms
- Error rate >1%
- Enrichment false positive rate >15%

**Acceptance**: Alerts trigger correctly

---

## Summary Statistics

### Time Estimates by Week

| Week | Total Hours | Tasks | Key Deliverables |
|------|-------------|-------|------------------|
| Week 1 | 40 hours | 17 tasks | 5 new intents, 5 new workflows, pattern matching |
| Week 2 | 40 hours | 15 tasks | Manifest enrichment, no forced interview |
| Week 3 | 40 hours | 13 tasks | JIT questions, conversational interview |
| Week 4 | 40 hours | 22 tasks | Testing, docs, rollout |
| **Total** | **160 hours** | **67 tasks** | **Production-ready system** |

---

### Files Created/Modified Summary

| Type | Created | Modified | Total |
|------|---------|----------|-------|
| Workflows | 5 | 7 | 12 |
| Chains | 6 | 1 | 7 |
| Core Logic | 4 | 2 | 6 |
| Tests | 10 | 0 | 10 |
| UI Components | 2 | 3 | 5 |
| Config | 3 | 2 | 5 |
| Documentation | 10 | 2 | 12 |
| **Total** | **40** | **17** | **57** |

---

### Effort by Category

| Category | Hours | % of Total |
|----------|-------|------------|
| Development | 90 hours | 56% |
| Testing | 30 hours | 19% |
| Documentation | 20 hours | 13% |
| Rollout & Monitoring | 10 hours | 6% |
| Code Review & Meetings | 10 hours | 6% |
| **Total** | **160 hours** | **100%** |

---

## Dependencies Between Tasks

### Critical Path

1. Day 1-2: Intent types → (blocks all workflow creation)
2. Day 3-4: New workflows → (blocks enrichment integration)
3. Day 6-7: Manifest enrichment → (blocks interview removal)
4. Day 8-9: Remove forced interview → (blocks JIT system)
5. Day 11-12: JIT system → (blocks conversational interview)
6. Day 13-14: Conversational interview → (blocks final testing)
7. Day 16-19: Testing & docs → (blocks rollout)
8. Day 20: Rollout

**Total Critical Path**: 20 days (no slack)

---

## Risk Factors

### High-Risk Tasks (Potential Delays)

1. **Task 6.1: ManifestEnricher** (Day 6)
   - Complex logic, many edge cases
   - Buffer: +4 hours

2. **Task 13.1: Conversational Interview Chain** (Day 13)
   - Requires extensive prompt engineering
   - Buffer: +4 hours

3. **Task 17.1: E2E Tests** (Day 17)
   - Flaky tests common in E2E
   - Buffer: +4 hours

4. **Task 20.2: Production Deployment** (Day 20)
   - Unexpected production issues
   - Buffer: +4 hours

**Total Buffer**: 16 hours (2 days)

---

## Daily Checklist Template

### Daily Standup Questions
1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers?
4. Do I need code review?

### Daily Close
- [ ] Code committed and pushed
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] PR created (if task complete)
- [ ] Tomorrow's task identified

---

## Sprint Completion Criteria

### Week 1
- [ ] 13 intents classify correctly (>95% accuracy)
- [ ] 5 new workflows implemented and registered
- [ ] Intent detection <300ms (P95)
- [ ] Pattern matching handles 40%+ queries

### Week 2
- [ ] Manifest enrichment extracts info from conversations
- [ ] Interview is optional, not forced
- [ ] All workflows handle incomplete manifests
- [ ] UI shows completeness indicator

### Week 3
- [ ] JIT questions only ask when needed
- [ ] Conversational interview feels natural
- [ ] "I don't know" responses handled gracefully
- [ ] Interview completion rate >85%

### Week 4
- [ ] 90%+ test coverage
- [ ] All documentation complete
- [ ] Feature flags configured
- [ ] Deployed to production (beta)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-31
**Status**: Ready for Execution
**Next**: Team review and sprint kick-off
