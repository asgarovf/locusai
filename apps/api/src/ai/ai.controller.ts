import {
  ChatRequest,
  ChatRequestSchema,
  ChatResponse,
  generateUUID,
  ShareChatRequest,
  ShareChatRequestSchema,
  User,
  WorkspaceIdParam,
  WorkspaceIdParamSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, Member, Public } from "@/auth/decorators";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AiService } from "./ai.service";

const ExecutionSchema = z.object({
  executionId: z.string(),
  sessionId: z.string(),
});
type ExecutionRequest = z.infer<typeof ExecutionSchema>;

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("ai/:workspaceId/chat")
  @Member()
  async chat(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Body(new ZodValidationPipe(ChatRequestSchema)) request: ChatRequest
  ): Promise<ChatResponse> {
    return this.aiService.chat(workspaceId, user.id, request);
  }

  @Post("ai/:workspaceId/chat/intent")
  @Member()
  async detectIntent(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Body(new ZodValidationPipe(ChatRequestSchema)) request: ChatRequest
  ) {
    return this.aiService.detectIntent(workspaceId, user.id, request);
  }

  @Post("ai/:workspaceId/chat/execute")
  @Member()
  async executeIntent(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Body(new ZodValidationPipe(ExecutionSchema)) request: ExecutionRequest
  ): Promise<ChatResponse> {
    return this.aiService.executeIntent(
      workspaceId,
      request.sessionId,
      request.executionId
    );
  }

  @Get("ai/:workspaceId/sessions")
  @Member()
  async listSessions(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam
  ) {
    const sessions = await this.aiService.findSessionsByUser(
      workspaceId,
      user.id
    );
    return {
      sessions: sessions.map((s) => ({
        id: s.externalSessionId,
        title: s.state.history?.[0]?.content?.slice(0, 50) || "New Chat",
        updatedAt: s.updatedAt,
        isShared: s.isShared,
      })),
    };
  }

  @Get("ai/:workspaceId/session/:sessionId")
  @Member()
  async getSession(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Param("sessionId") sessionId: string
  ): Promise<ChatResponse> {
    const session = await this.aiService.getSession(workspaceId, sessionId);
    if (!session || session.userId !== user.id) {
      throw new NotFoundException("Session not found");
    }

    // Return the last message from history if it exists, otherwise a welcome message
    const history = session.state.history || [];
    const lastAssistantMessage = [...history]
      .reverse()
      .find((m) => m.role === "assistant");

    return {
      sessionId,
      message: lastAssistantMessage
        ? {
            id: generateUUID(),
            role: "assistant",
            content: lastAssistantMessage.content,
            artifacts: lastAssistantMessage.artifacts,
            timestamp: new Date(),
          }
        : {
            id: generateUUID(),
            role: "assistant",
            content:
              "Welcome back! How can I help you with your project today?",
            timestamp: new Date(),
          },
      history: history.map((m) => ({
        ...m,
        id: generateUUID(),
        timestamp: new Date(),
      })),
    };
  }

  @Delete("ai/:workspaceId/session/:sessionId")
  @Member()
  async deleteSession(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Param("sessionId") sessionId: string
  ): Promise<void> {
    await this.aiService.deleteSession(workspaceId, user.id, sessionId);
  }

  @Post("ai/:workspaceId/session/:sessionId/share")
  @Member()
  async shareSession(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Param("sessionId") sessionId: string,
    @Body(new ZodValidationPipe(ShareChatRequestSchema))
    request: ShareChatRequest
  ): Promise<void> {
    await this.aiService.shareSession(
      workspaceId,
      user.id,
      sessionId,
      request.isShared
    );
  }

  @Get("ai/shared/:sessionId")
  @Public()
  async getSharedSession(
    @Param("sessionId") sessionId: string
  ): Promise<ChatResponse> {
    const session = await this.aiService.getSharedSession(sessionId);
    if (!session) {
      throw new NotFoundException("Shared session not found");
    }

    const history = session.state.history || [];
    return {
      sessionId,
      message: {
        id: generateUUID(),
        role: "assistant",
        content: "Viewing shared chat history",
        timestamp: new Date(),
      },
      history: history.map((m) => ({
        ...m,
        id: generateUUID(),
        timestamp: new Date(),
      })),
    };
  }
}
