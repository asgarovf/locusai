export interface AiRunner {
  run(prompt: string, isPlanning?: boolean): Promise<string>;
}

export type AiProvider = "claude" | "codex";
