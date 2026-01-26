export type Artifact = {
  id: string;
  type: "code" | "document" | "image";
  title: string;
  content: string;
  language?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  relatedArtifactId?: string; // ID of the artifact this message is discussing
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: Date;
};
