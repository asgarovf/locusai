import {
  ChatRequest,
  ChatRequestSchema,
  ChatResponse,
  generateUUID,
  MembershipRole,
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
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, MembershipRoles } from "@/auth/decorators";
import { MembershipRolesGuard } from "@/auth/guards";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AiService } from "./ai.service";

@Controller()
@UseGuards(MembershipRolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("ai/:workspaceId/chat")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async chat(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Body(new ZodValidationPipe(ChatRequestSchema)) request: ChatRequest
  ): Promise<ChatResponse> {
    return this.aiService.chat(workspaceId, user.id, request);
  }

  @Get("ai/:workspaceId/sessions")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
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
      })),
    };
  }

  @Get("ai/:workspaceId/session/:sessionId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
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
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async deleteSession(
    @CurrentUser() user: User,
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    { workspaceId }: WorkspaceIdParam,
    @Param("sessionId") sessionId: string
  ): Promise<void> {
    await this.aiService.deleteSession(workspaceId, user.id, sessionId);
  }
}
