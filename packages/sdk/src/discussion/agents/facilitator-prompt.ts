import type {
  DiscussionInsight,
  DiscussionMessage,
} from "../discussion-types.js";

export interface FacilitatorPromptInput {
  topic: string;
  projectContext: string | null;
  learnings: string | null;
  knowledgeBase: string;
  previousMessages: DiscussionMessage[];
  insights: DiscussionInsight[];
  isFirstMessage: boolean;
}

export function buildFacilitatorPrompt(input: FacilitatorPromptInput): string {
  const {
    topic,
    projectContext,
    learnings,
    knowledgeBase,
    previousMessages,
    insights,
    isFirstMessage,
  } = input;

  let sections = "";

  // Project context
  if (projectContext) {
    sections += `\n<project_context>\n${projectContext}\n</project_context>\n`;
  }

  // Knowledge base
  sections += `\n<knowledge_base>\n${knowledgeBase}\n</knowledge_base>\n`;

  // Learnings
  if (learnings) {
    sections += `\n<learnings>\nThese are accumulated lessons from past work on this project. Use them to ask more informed questions:\n${learnings}\n</learnings>\n`;
  }

  // Conversation history
  if (previousMessages.length > 0) {
    let history = "";
    for (const msg of previousMessages) {
      const role = msg.role === "user" ? "User" : "Facilitator";
      history += `[${role}]: ${msg.content}\n\n`;
    }
    sections += `\n<conversation_history>\n${history.trimEnd()}\n</conversation_history>\n`;
  }

  // Existing insights extracted so far
  if (insights.length > 0) {
    let insightsText = "";
    for (const insight of insights) {
      insightsText += `- [${insight.type.toUpperCase()}] ${insight.title}: ${insight.content}\n`;
    }
    sections += `\n<extracted_insights>\nInsights identified so far in this discussion:\n${insightsText.trimEnd()}\n</extracted_insights>\n`;
  }

  const firstMessageInstruction = isFirstMessage
    ? `This is the START of the discussion. Introduce yourself briefly, then ask your first probing question about the topic. Do NOT extract any insights yet — there is no user input to extract from.`
    : `Continue the discussion by responding to the user's latest message. Build on their answers to go deeper. After responding, extract any insights from their message.`;

  return `<discussion_facilitator>
You are a product strategy facilitator leading a structured discussion.

<topic>
${topic}
</topic>
${sections}
<role>
You are an expert product strategy facilitator. Your job is to:
1. Ask probing, specific questions about the topic — never generic or surface-level
2. Build on previous answers to progressively deepen the conversation
3. Identify and extract key decisions, requirements, ideas, concerns, and learnings
4. Reference existing project context and learnings to ask informed questions
5. When the topic feels fully explored, suggest wrapping up with a summary
</role>

<rules>
- ${firstMessageInstruction}
- Ask ONE focused question at a time. Do not overwhelm with multiple questions.
- Be conversational but purposeful — every question should drive toward actionable insights.
- When you identify an insight from the user's response, include it as a structured XML block in your response.
- Insight blocks use this format within your response text:

<insight>
{"type": "decision|requirement|idea|concern|learning", "title": "short title", "content": "detailed description", "tags": ["relevant", "tags"]}
</insight>

- You may include multiple <insight> blocks if the user's response contains several distinct insights.
- The insight blocks will be parsed and removed from the displayed response, so write your conversational text as if they are not there.
- Types explained:
  - **decision**: A choice or direction that has been made or agreed upon
  - **requirement**: A specific need, constraint, or must-have
  - **idea**: A suggestion, proposal, or possibility to explore
  - **concern**: A risk, worry, or potential problem identified
  - **learning**: A realization, lesson, or important context discovered
- Keep responses concise. Aim for 2-4 sentences of conversation plus any insight blocks.
- If the user's responses indicate the topic is well-explored, suggest summarizing and wrapping up.
</rules>
</discussion_facilitator>`;
}

export function buildSummaryPrompt(
  topic: string,
  messages: DiscussionMessage[],
  insights: DiscussionInsight[]
): string {
  let history = "";
  for (const msg of messages) {
    const role = msg.role === "user" ? "User" : "Facilitator";
    history += `[${role}]: ${msg.content}\n\n`;
  }

  let insightsText = "";
  if (insights.length > 0) {
    for (const insight of insights) {
      insightsText += `- [${insight.type.toUpperCase()}] **${insight.title}**: ${insight.content}`;
      if (insight.tags.length > 0) {
        insightsText += ` (tags: ${insight.tags.join(", ")})`;
      }
      insightsText += "\n";
    }
  }

  return `<discussion_summary>
Create a final summary of this product discussion.

<topic>
${topic}
</topic>

<conversation>
${history.trimEnd()}
</conversation>

${insightsText ? `<insights>\n${insightsText.trimEnd()}\n</insights>\n` : ""}
<rules>
- Write a clear, structured summary of the entire discussion.
- Organize by: Key Decisions, Requirements, Ideas to Explore, Concerns & Risks, and Learnings.
- Only include sections that have relevant content — skip empty categories.
- For each item, provide a brief but actionable description.
- End with a "Next Steps" section listing concrete action items that emerged.
- Be concise — this summary should be scannable and useful as a reference.
- Do NOT include any <insight> XML blocks in the summary.
</rules>
</discussion_summary>`;
}
