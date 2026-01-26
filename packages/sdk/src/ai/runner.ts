import type { Provider } from "../core/config.js";

export interface AiRunner {
  run(prompt: string, isPlanning?: boolean): Promise<string>;
}

export type AiProvider = Provider;
