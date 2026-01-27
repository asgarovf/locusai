import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

export enum Intent {
  INTERVIEW = "INTERVIEW",
  PLANNING = "PLANNING",
  QUERY = "QUERY",
  ANALYSIS = "ANALYSIS",
  DOCUMENTING = "DOCUMENTING",
  COMPILING = "COMPILING",
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
2. PLANNING: The user wants to create a sprint, break down a feature, or organize tasks manually.
3. QUERY: The user is asking a general question about the project, status, or search for information.
4. ANALYSIS: The user asking to analyze the existing codebase, file structure, or repository context.
5. DOCUMENTING: The user wants to create, update, or discuss a specific document (PRD, Spec, etc.).
6. COMPILING: The user wants to turn a document into actionable tasks (e.g., "generate tasks from this doc").

Recent Conversation History:
{history}

User Input: {input}

Return only a JSON object with the following structure:
{{
  "intent": "INTERVIEW" | "PLANNING" | "QUERY" | "ANALYSIS" | "DOCUMENTING" | "COMPILING",
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}}`;

export const createIntentChain = (llm: BaseChatModel) => {
  const prompt = PromptTemplate.fromTemplate(INTENT_PROMPT);
  const parser = new JsonOutputParser<IntentResponse>();

  return RunnableSequence.from([prompt, llm, parser]);
};
