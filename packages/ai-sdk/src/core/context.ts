import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import type { AgentState } from "../interfaces/index";

export class ContextManager {
  static buildMessages(
    history: AgentState["history"],
    input: string,
    systemPrompt?: string
  ): BaseMessage[] {
    const messages: BaseMessage[] = [];
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }

    // Add conversation history
    for (const msg of history) {
      if (msg.role === "user") {
        messages.push(new HumanMessage(msg.content));
      } else {
        messages.push(new AIMessage(msg.content));
      }
    }

    // Add current user input
    messages.push(new HumanMessage(input));
    return messages;
  }

  static getProjectContext(state: AgentState): string {
    const m = state.manifest;
    if (!m) return "You are Locus AI, a Senior Project Manager Agent.";

    return `You are Locus AI, a Senior Project Manager and Lead Architect.
Your goal is to ensure this project is planned and executed with the highest professional standards.

YOUR STANDARDS:
- When creating tasks, NEVER provide one-line descriptions. 
- Every task MUST have a detailed description that explains the technical requirements, implementation steps, and context.
- Every task MUST include a clear 'Acceptance Checklist' with specific, testable criteria.
- Use the Tech Stack and Features listed below to inform the technical depth of your work.
- Maintain a highly professional, proactive, and expert tone.
- ALWAYS USE RICH MARKDOWN for your responses. Use headings (###), bold text, bullet points, and code blocks where appropriate to make your responses structured and readable.
- You may include IDs (e.g., in parentheses) if it helps you reference them later, especially for lists of tasks or sprints.
- The UI handles interactive elements, but you should provide a clear text summary.

Project Knowledge (MANIFEST):
- Project Name: ${m.name || "Unknown"}
- Current Phase: ${m.phase || "PLANNING"}
- Mission & Vision: ${m.mission || "Not yet defined"}
- Tech Stack: ${m.techStack?.join(", ") || "Not yet defined"}
- Features: ${m.features?.join(", ") || "Not yet defined"}
- Competitors: ${m.competitors?.join(", ") || "Not yet defined"}
- Brand Voice: ${m.brandVoice || "Not yet defined"}
- Success Metrics: ${m.successMetrics?.join(", ") || "Not yet defined"}
- Completeness Score: ${m.completenessScore}%

CURRENT WORKFLOW STATE:
${ContextManager.formatWorkflowState(state)}

SPRINT MANAGEMENT GUIDELINES:
- If 'list_sprints' returns no COMPLETED or ACTIVE sprints, but has PLANNED sprints, consider the first PLANNED sprint as the "Current Sprint" for planning purposes.
- Do NOT say "There are no active sprints" as a blocker. Instead, say "We are currently planning [Sprint Name]" or "Tasks have been added to the upcoming sprint".
- Always use 'batch_update_tasks' with sprintId='active' or 'next' to move tasks. The system automates the selection.

Use this knowledge to act as the true owner of this project. 

YOUR MISSION:
1. If the project is in PLANNING phase, help the user discover features and organize them into tasks and sprints.
2. If a sprint is created, proactively suggest moving relevant backlog tasks into it using 'batch_update_tasks'.
3. Always offer to draft documents (PRDs, Technical Specs) or refine existing ones.
4. You are not just a simple assistant; you are the architect. Be proactive and suggest next steps.
5. If the user asks for status or information, use the 'list' tools to get real data before answering.
6. AT THE END OF EVERY RESPONSE, you MUST provide 2-3 suggested next steps for the user to keep the momentum.
 
Format them exactly as: <suggestions>[{"label": "Brief Label", "text": "What the user says if they click this"}]</suggestions>
 
GUIDELINES FOR SUGGESTIONS:
- Keep them SIMPLE and ACTIONABLE (e.g., "Create related task", "View details", "Draft specs").
- DO NOT suggest complex state changes (e.g., "Move to progress and assign to me") unless you are sure the user can do it dynamically.
- DO NOT hallucinate specific sprint names or IDs that you haven't seen.
- Keep descriptions in 'text' proactive and specific.`;
  }

  static getToolExecutionSystemPrompt(
    projectContext: string,
    observations: string[]
  ): string {
    return (
      `${projectContext}\n\n` +
      `You have successfully executed actions. 
The tool outputs have been processed by the system.
User will see the created/fetched items in the UI.

Obersvations:
${observations.join("\n")}

Return a professional summary of what was done.
Include IDs in your summary if they will be useful for next steps (e.g. moving tasks).`
    );
  }

  // Placeholder for context packaging logic
  // Typically this would fetch from DB, so it might need to be in a service,
  // but we can put the formatting logic here.
  static formatTaskContextForLocalAI(
    task: { title: string; description: string; status: string },
    projectManifest: Partial<AgentState["manifest"]>
  ): string {
    return JSON.stringify(
      {
        task: {
          title: task.title,
          description: task.description,
          status: task.status,
        },
        project: {
          name: projectManifest?.name || "Unknown",
          techStack: projectManifest?.techStack || [],
        },
        context:
          "This is a snapshot of the task context for local execution. Use this to guide your implementation.",
      },
      null,
      2
    );
  }

  static formatWorkflowState(state: AgentState): string {
    const w = state.workflow;
    if (!w) return "No active workflow state.";

    const entities = w.createdEntities
      .map(
        (e) =>
          `- [${e.type.toUpperCase()}] ${e.title} (ID: ${e.id}) (Created: ${e.createdAt})`
      )
      .join("\n");

    return `
Current Intent: ${w.currentIntent}
Created Entities (USE THESE IDs):
${entities || "No entities created yet."}

Pending Actions:
${w.pendingActions.map((a) => `- ${a}`).join("\n") || "None"}
`;
  }
}
