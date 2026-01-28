import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { ProjectManifest } from "../interfaces/index";

const MANIFEST_UPDATER_PROMPT = `You are a background process for Locus AI. Your job is to silently monitor the conversation and update the Project Manifest if the user provides new, concrete details about the project.

Current Project Manifest: {manifest}
Recent Conversation History:
{history}

User Input: {input}

INSTRUCTIONS:
1. Analyze the input and history for any new information regarding: Name, Mission, Target Users, Tech Stack, Features, Competitors, Brand Voice, Success Metrics.
2. If new info is found, update the corresponding fields.
3. If no new info is found, return the manifest exactly as is (or partial).
4. Be conservative. Do not hallucinate or guess. Only update if clearly stated or implied by the user.

Return a JSON object with the UPDATED fields only (Partial Manifest).
Example:
{{
  "techStack": ["React", "Node.js"]
}}
If nothing to update, return empty object {{}}.
`;

export const createManifestUpdaterChain = (llm: BaseChatModel) => {
  const prompt = PromptTemplate.fromTemplate(MANIFEST_UPDATER_PROMPT);
  const parser = new JsonOutputParser<Partial<ProjectManifest>>();

  return RunnableSequence.from([prompt, llm, parser]);
};
