/**
 * Sprint Planning Prompt
 *
 * Uses XML system message structure to provide clear, structured instructions
 * to the AI for sprint planning from a CEO directive.
 *
 * The AI agent writes the plan JSON file directly to the plans directory.
 */

export interface PlannerInput {
  directive: string;
  feedback?: string;
  /** Absolute path to the plans directory (e.g. /project/.locus/plans) */
  plansDir: string;
  /** Pre-generated plan ID (e.g. plan-1234567890) */
  planId: string;
  /** File name slug derived from the plan name */
  fileName: string;
}

export function buildPlannerPrompt(input: PlannerInput): string {
  let feedbackSection = "";
  if (input.feedback) {
    feedbackSection = `
<ceo_feedback>
The CEO has reviewed a previous plan and wants changes. Incorporate this feedback:
${input.feedback}
</ceo_feedback>
`;
  }

  const now = new Date().toISOString();

  return `<sprint_planning>
Create a sprint plan for this directive: ${input.directive}
${feedbackSection}
<rules>
- Tasks execute sequentially by one agent on one branch
- Each task must be self-contained with clear What/Where/How
- No forward dependencies (task N can't need task N+1)
- Foundation first (shared code, types, schemas before features)
- Be specific: exact file paths, function names, implementation details
- Each task description is the ONLY instruction an independent agent receives — include all context it needs
- Merge trivially small related work into one task
- Assign appropriate roles: BACKEND, FRONTEND, QA, PM, or DESIGN
</rules>

<output>
Write the sprint plan as a JSON file to: ${input.plansDir}/${input.fileName}.json

The JSON file must contain this exact structure:
{
  "id": "${input.planId}",
  "name": "2-4 words",
  "goal": "One paragraph of what this delivers",
  "directive": ${JSON.stringify(input.directive)},
  "estimatedDays": number,
  "status": "pending",
  "createdAt": "${now}",
  "updatedAt": "${now}",
  "tasks": [
    {
      "index": 1,
      "title": "Action-oriented title",
      "description": "What: goal\\nWhere: files to modify\\nHow: implementation details\\nBoundaries: what's excluded",
      "assigneeRole": "BACKEND|FRONTEND|QA|PM|DESIGN",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "labels": ["tags"],
      "acceptanceCriteria": ["testable conditions"],
      "complexity": 1-5
    }
  ],
  "risks": [
    {
      "description": "What could go wrong",
      "mitigation": "How to handle it",
      "severity": "low|medium|high"
    }
  ]
}

IMPORTANT:
- Write the file directly using your file writing tool. Do NOT output the JSON as text.
- Tasks must have sequential "index" values starting at 1.
- The file must be valid JSON with no comments or trailing commas.
- Do not create any other files. Only create the single JSON file specified above.
</output>
</sprint_planning>`;
}
