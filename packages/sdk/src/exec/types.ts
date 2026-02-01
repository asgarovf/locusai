/**
 * Stream chunk types for real-time AI output streaming.
 */

/**
 * Text delta chunk - contains incremental text content
 */
export interface TextDeltaChunk {
  type: "text_delta";
  content: string;
}

/**
 * Tool parameters for different tool types.
 */
export interface ReadToolParams {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface WriteToolParams {
  file_path: string;
  content: string;
}

export interface EditToolParams {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface BashToolParams {
  command: string;
  description?: string;
  timeout?: number;
}

export interface GrepToolParams {
  pattern: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: "content" | "files_with_matches" | "count";
}

export interface GlobToolParams {
  pattern: string;
  path?: string;
}

export interface WebFetchToolParams {
  url: string;
  prompt: string;
}

export interface TaskToolParams {
  description: string;
  prompt: string;
  subagent_type: string;
}

export type ToolParams =
  | ReadToolParams
  | WriteToolParams
  | EditToolParams
  | BashToolParams
  | GrepToolParams
  | GlobToolParams
  | WebFetchToolParams
  | TaskToolParams
  | Record<string, unknown>;

/**
 * Tool use chunk - indicates an AI tool is being invoked
 */
export interface ToolUseChunk {
  type: "tool_use";
  tool: string;
  id?: string;
  parameters?: ToolParams;
}

/**
 * Tool result data for different tool types.
 */
export interface GrepResultData {
  matches?: number;
  files?: string[];
}

export interface GlobResultData {
  files?: string[];
  count?: number;
}

export interface ReadResultData {
  lines?: number;
  size?: number;
}

export interface BashResultData {
  exitCode?: number;
  output?: string;
}

export type ToolResultData =
  | GrepResultData
  | GlobResultData
  | ReadResultData
  | BashResultData
  | Record<string, unknown>;

/**
 * Tool result chunk - indicates a tool has completed
 */
export interface ToolResultChunk {
  type: "tool_result";
  tool: string;
  id?: string;
  success: boolean;
  error?: string;
  duration?: number;
  data?: ToolResultData;
}

/**
 * Thinking chunk - indicates the AI is processing/thinking
 */
export interface ThinkingChunk {
  type: "thinking";
  content?: string;
}

/**
 * Result chunk - final result when stream completes
 */
export interface ResultChunk {
  type: "result";
  content: string;
}

/**
 * Error chunk - indicates an error occurred during streaming
 */
export interface ErrorChunk {
  type: "error";
  error: string;
}

/**
 * Tool parameters chunk - emitted when tool parameters are fully parsed
 */
export interface ToolParametersChunk {
  type: "tool_parameters";
  tool: string;
  id?: string;
  parameters: ToolParams;
}

/**
 * Union type of all possible stream chunks
 */
export type StreamChunk =
  | TextDeltaChunk
  | ToolUseChunk
  | ToolResultChunk
  | ThinkingChunk
  | ResultChunk
  | ErrorChunk
  | ToolParametersChunk;
