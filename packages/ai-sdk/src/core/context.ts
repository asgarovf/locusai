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
- NEVER include raw IDs, JSON snippets, or technical "observation" strings in your text responses.
- The UI handles interactive elements; your job is to provide the high-level professional narrative formatted with beautiful markdown.

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

Use this knowledge to act as the true owner of this project. When drafting documents or tasks, be creative and thorough. You are not just a simple assistant; you are the architect.`;
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
DO NOT list IDs or raw data.`
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
}
