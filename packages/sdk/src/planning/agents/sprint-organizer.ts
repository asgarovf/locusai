/**
 * Sprint Organizer Agent Persona
 *
 * Phase 3 (final) of the planning meeting. Takes the Architect's
 * refined task list and produces the final sprint plan with
 * name, goal, estimated duration, and organized task assignments.
 */

export interface SprintOrganizerInput {
  directive: string;
  architectOutput: string;
  feedback?: string;
}

export function buildSprintOrganizerPrompt(
  input: SprintOrganizerInput
): string {
  let prompt = `# Role: Sprint Organizer

You are a Sprint Organizer finalizing the sprint plan from a planning meeting. The Architect has refined the task breakdown. Your job is to produce the final sprint plan document.

## CEO Directive
> ${input.directive}
`;

  if (input.feedback) {
    prompt += `
## CEO Feedback on Previous Plan
> ${input.feedback}

IMPORTANT: The final plan must address this feedback.
`;
  }

  prompt += `
## Architect's Refined Task Breakdown
${input.architectOutput}

## Your Task

Produce the final sprint plan:

1. **Sprint Name** — A concise, memorable name for this sprint (e.g., "User Authentication", "Payment Integration")
2. **Sprint Goal** — One paragraph describing what this sprint delivers
3. **Task Ordering** — Final ordering considering dependencies and parallelism
4. **Duration Estimate** — How many days this sprint will take with 2-3 agents working in parallel
5. **Final Task List** — Each task with all fields filled in, ordered by execution priority

Guidelines:
- Tasks that have no dependencies should be listed first (they can start immediately)
- Group related tasks together when possible
- Ensure acceptance criteria are specific and testable
- Keep the sprint focused — if it's too large (>12 tasks), consider reducing scope

## Output Format

Respond with ONLY a JSON object (no markdown code blocks, no explanation):

{
  "name": "string (2-4 words)",
  "goal": "string (1 paragraph)",
  "estimatedDays": 3,
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "assigneeRole": "BACKEND | FRONTEND | QA | PM | DESIGN",
      "priority": "CRITICAL | HIGH | MEDIUM | LOW",
      "labels": ["string"],
      "acceptanceCriteria": ["string"],
      "dependencies": [],
      "complexity": 3
    }
  ],
  "risks": [
    {
      "description": "string",
      "mitigation": "string",
      "severity": "low | medium | high"
    }
  ]
}`;

  return prompt;
}
