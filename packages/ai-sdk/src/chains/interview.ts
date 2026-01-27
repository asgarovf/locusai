import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { type SuggestedAction } from "@locusai/shared";
import type { ProjectManifest } from "../interfaces/index";

const INTERVIEW_PROMPT = `You are Locus AI, a Senior Technical Product Manager. Your job is to rigorously interview the user to build a comprehensive Project Manifest.

Current Project Manifest: {manifest}
Recent Conversation History:
{history}

User Input: {input}

OBJECTIVES:
1. Update the manifest with high-precision details.
2. If the user gives a vague answer (e.g., "Blockchain"), you MUST ask for specifics (e.g., "Which chain? Solidity or Rust? Frameworks?").
3. DO NOT mark a field as complete (remove from missingInfo) until it meets the Quality Standards below.

QUALITY STANDARDS:
- "name": Official project name.
- "mission": Must explain the "Why" and "How". No one-liners.
- "targetUsers": Specific personas (e.g., "DeFi Traders", "Enterprise HR Managers"), not just "everyone".
- "techStack": MUST include: Language, Frontend, Backend, Database, Infrastructure, Key Libraries/SDKs.
- "features": List of concrete functional modules (e.g., "User Auth via Privy", "Swap Interface"), not marketing terms.
- "competitors": Real companies or projects.
- "brandVoice": Specific adjectives (e.g., "Professional but witty").
- "successMetrics": KPI-driven (e.g., "10k MAU", "<1s latency").

Your goal is to move the 'completenessScore' to 100% only when the plan is executable by a dev team.

IMPORTANT: Your response MUST be valid JSON. Escape all newlines as \\n and double quotes within strings.
Return a JSON object:
{{
  "manifest": {{
    "name": "...",
    "mission": "...",
    "targetUsers": ["...", "..."],
    "techStack": ["...", "..."],
    "phase": "...",
    "features": ["...", "..."],
    "competitors": ["...", "..."],
    "brandVoice": "...",
    "successMetrics": ["...", "..."],
    "completenessScore": number (0-100)
  }},
  "missingInfo": ["list", "of", "keys", "that", "need", "more", "detail"],
  "nextQuestion": "A targeted, intelligent follow-up question to dig deeper into the incomplete areas. ALWAYS USE MARKDOWN for better readability (use bold for emphasis, bullet points for lists, and proper spacing between paragraphs). Make it look professional and structured.",
  "suggestedActions": [
    {{ "label": "Short suggestion 1", "type": "chat_suggestion", "payload": {{ "text": "Self-explanatory text" }} }},
    {{ "label": "Short suggestion 2", "type": "chat_suggestion", "payload": {{ "text": "Self-explanatory text" }} }}
  ]
}}`;

export interface InterviewResponse {
  manifest: ProjectManifest;
  missingInfo: string[];
  nextQuestion: string;
  suggestedActions?: SuggestedAction[];
}

export const createInterviewChain = (llm: BaseChatModel) => {
  const prompt = PromptTemplate.fromTemplate(INTERVIEW_PROMPT);
  const parser = new JsonOutputParser<InterviewResponse>();

  return RunnableSequence.from([prompt, llm, parser]);
};
