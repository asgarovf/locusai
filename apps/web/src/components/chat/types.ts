import { $FixMe } from "@locusai/shared";

export type ArtifactType =
  | "code"
  | "document"
  | "image"
  | "sprint"
  | "task"
  | "task_list";

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export type ReferenceType = "file" | "documentation" | "task";

export interface Reference {
  id: string;
  type: ReferenceType;
  title: string;
  url?: string;
  preview?: string;
}

export type Role = "system" | "user" | "assistant";

export interface BaseMessage {
  id: string;
  role: Role;
  timestamp: Date;
}

export interface SystemMessage extends BaseMessage {
  role: "system";
  content: string;
  level: "info" | "warning" | "error" | "success";
}

export interface UserMessage extends BaseMessage {
  role: "user";
  content: string;
  attachments?: Artifact[];
}

export interface SuggestedAction {
  label: string;
  type:
    | "chat_suggestion"
    | "create_task"
    | "create_doc"
    | "start_sprint"
    | "plan_sprint";
  payload?: $FixMe;
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  content: string; // Markdown content
  thoughtProcess?: string; // Chain of thought/reasoning
  artifacts?: Artifact[]; // Generated artifacts (code, docs)
  references?: Reference[]; // Context-used references
  relatedArtifactId?: string;
  suggestedActions?: SuggestedAction[];
}

export type Message = SystemMessage | UserMessage | AssistantMessage;

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
  summary?: string;
}
