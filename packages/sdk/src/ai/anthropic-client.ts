import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "../core/config.js";

export interface AnthropicClientConfig {
  apiKey: string;
  model?: string;
}

export interface CachedPromptOptions {
  systemPrompt?: string;
  cacheableContext?: string[];
  userPrompt: string;
}

/**
 * Anthropic Client with Prompt Caching Support
 *
 * This client wraps the official Anthropic SDK and adds support for
 * prompt caching to dramatically reduce latency and costs for repeated
 * context (like codebase indexes, CLAUDE.md, etc.)
 */
export class AnthropicClient {
  private client: Anthropic;
  private model: string;

  constructor(config: AnthropicClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || DEFAULT_MODEL;
  }

  /**
   * Run a prompt with optional caching for large context blocks
   *
   * @param options - Prompt configuration with cacheable context
   * @returns The generated text response
   */
  async run(options: CachedPromptOptions): Promise<string> {
    const { systemPrompt, cacheableContext = [], userPrompt } = options;

    // Build system message with cache breakpoints
    const systemContent: Anthropic.Messages.TextBlockParam[] = [];

    if (systemPrompt) {
      systemContent.push({
        type: "text",
        text: systemPrompt,
      });
    }

    // Add each cacheable context block with cache_control
    for (let i = 0; i < cacheableContext.length; i++) {
      const isLast = i === cacheableContext.length - 1;
      systemContent.push({
        type: "text",
        text: cacheableContext[i],
        // Only the last block gets the cache breakpoint
        ...(isLast && {
          cache_control: { type: "ephemeral" as const },
        }),
      });
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8000,
      system: systemContent,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract text from response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text"
    );

    return textBlocks.map((block) => block.text).join("\n");
  }

  /**
   * Simple run without caching (for short prompts)
   */
  async runSimple(prompt: string): Promise<string> {
    return this.run({
      userPrompt: prompt,
    });
  }
}
