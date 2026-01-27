import { ChatRequest, ChatResponse } from "@locusai/shared";
import { BaseModule } from "./base.js";

export class AIModule extends BaseModule {
  /**
   * Send a message to the Locus AI Agent and get a response.
   */
  async chat(workspaceId: string, body: ChatRequest): Promise<ChatResponse> {
    const { data } = await this.api.post<ChatResponse>(
      `/ai/${workspaceId}/chat`,
      body
    );
    return data;
  }

  /**
   * List all chat sessions for the current user in a workspace.
   */
  async listSessions(
    workspaceId: string
  ): Promise<{ sessions: { id: string; title: string; updatedAt: string }[] }> {
    const { data } = await this.api.get<{
      sessions: { id: string; title: string; updatedAt: string }[];
    }>(`/ai/${workspaceId}/sessions`);
    return data;
  }

  /**
   * Get an existing chat session with its history.
   */
  async getSession(
    workspaceId: string,
    sessionId: string
  ): Promise<ChatResponse> {
    const { data } = await this.api.get<ChatResponse>(
      `/ai/${workspaceId}/session/${sessionId}`
    );
    return data;
  }

  /**
   * Get a streaming chat response.
   * Note: This is a placeholder for actual SSE implementation in the SDK.
   */
  getChatStreamUrl(workspaceId: string, sessionId: string): string {
    return `${this.api.defaults.baseURL}/ai/${workspaceId}/chat/stream?sessionId=${sessionId}`;
  }
}
