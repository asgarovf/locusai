import {
  AcceptInvitation,
  AcceptInvitationSchema,
  CreateInvitation,
  CreateInvitationSchema,
  InvitationResponse,
  InvitationsResponse,
  InvitationVerifyParam,
  InvitationVerifyParamSchema,
  OrgIdParam,
  OrgIdParamSchema,
} from "@locusai/shared";
import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MemberAdmin } from "@/auth/decorators/membership-roles.decorator";
import { Public } from "@/auth/decorators/public.decorator";
import { CurrentUser } from "@/auth/decorators/user.decorator";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { User } from "@/entities";
import { InvitationsService } from "./invitations.service";

@ApiTags("Invitations")
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post("org/:orgId/invitations")
  @MemberAdmin()
  @ApiOperation({ summary: "Create an organization invitation" })
  @ApiOkResponse({ description: "Invitation created successfully." })
  async create(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(CreateInvitationSchema)) body: CreateInvitation
  ): Promise<InvitationResponse> {
    const invitation = await this.invitationsService.create({
      email: body.email,
      orgId: params.orgId,
      role: body.role,
      invitedByUserId: user.id,
    });
    return { invitation } as unknown as InvitationResponse;
  }

  @Get("org/:orgId/invitations")
  @MemberAdmin()
  @ApiOperation({ summary: "List organization invitations" })
  @ApiOkResponse({ description: "Invitations returned successfully." })
  async list(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<InvitationsResponse> {
    const invitations = await this.invitationsService.listByOrg(params.orgId);
    return { invitations } as unknown as InvitationsResponse;
  }

  @Public()
  @Get("invitations/verify/:token")
  @ApiOperation({ summary: "Verify invitation token" })
  @ApiOkResponse({ description: "Invitation returned successfully." })
  async verify(
    @Param(new ZodValidationPipe(InvitationVerifyParamSchema))
    params: InvitationVerifyParam
  ): Promise<InvitationResponse> {
    const invitation = await this.invitationsService.findByToken(params.token);
    return { invitation } as unknown as InvitationResponse;
  }

  @Public()
  @Post("invitations/accept")
  async accept(
    @Body(new ZodValidationPipe(AcceptInvitationSchema)) body: AcceptInvitation
  ) {
    const membership = await this.invitationsService.accept(
      body.token,
      body.name
    );
    return { membership };
  }

  @Delete("org/:orgId/invitations/:invitationId")
  @MemberAdmin()
  async revoke(@Param("invitationId") invitationId: string) {
    await this.invitationsService.revoke(invitationId);
    return { success: true };
  }
}
