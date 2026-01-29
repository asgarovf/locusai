import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export type AIProvider = "gemini" | "claude" | "openai";

export interface LLMConfig {
  provider?: AIProvider;
  apiKey?: string;
  temperature?: number;
  modelName?: string;
  maxOutputTokens?: number;
}

export class LLMFactory {
  static create(config: LLMConfig = {}): BaseChatModel {
    const provider = config.provider || "gemini";
    const temperature = config.temperature ?? 0.7;
    const maxOutputTokens = config.maxOutputTokens;

    switch (provider) {
      case "gemini":
        return new ChatGoogleGenerativeAI({
          model: config.modelName || "gemini-3-pro-preview",
          temperature,
          maxOutputTokens,
          apiKey: config.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
      case "claude":
      case "openai":
        throw new Error(`Provider ${provider} not implemented yet`);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
