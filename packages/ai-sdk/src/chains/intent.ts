import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

export enum Intent {
  INTERVIEW = "INTERVIEW",
  QUERY = "QUERY",
  IDEA = "IDEA",
  PRODUCT_DOCUMENTING = "PRODUCT_DOCUMENTING",
  TECHNICAL_DOCUMENTING = "TECHNICAL_DOCUMENTING",
  UNKNOWN = "UNKNOWN",
}

export interface IntentResponse {
  intent: Intent;
  confidence: number;
  reasoning: string;
}

const INTENT_PROMPT = `You are the Intent Classifier for Locus AI, a Project Manager Agent.
Your job is to determine what the user wants based on their input.

Possible Intents:
1. INTERVIEW: The user is providing details about their project, goals, tech stack, or answering your questions.
2. QUERY: The user is asking a general question about the project, status, or search for information.
3. IDEA: The user wants to explore ideas about the project's next steps (e.g., "what do you think about...", "how should we approach...").
4. PRODUCT_DOCUMENTING: The user wants to discuss, brainstorm, or get advice on product documents (PRD, Timeline, Budget, User Stories, etc.).
5. TECHNICAL_DOCUMENTING: The user wants to discuss, brainstorm, or get advice on technical documents (Sequence diagrams, User flows, technical architecture, schema, etc.).

Recent Conversation History:
{history}

User Input: {input}

Return only a JSON object with the following structure:
{{
  "intent": "INTERVIEW" | "QUERY" | "IDEA" | "PRODUCT_DOCUMENTING" | "TECHNICAL_DOCUMENTING",
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}}`;

export const createIntentChain = (llm: BaseChatModel) => {
  const prompt = PromptTemplate.fromTemplate(INTENT_PROMPT);
  const parser = new JsonOutputParser<IntentResponse>();

  return RunnableSequence.from([prompt, llm, parser]);
};
