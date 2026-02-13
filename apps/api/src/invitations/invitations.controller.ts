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
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { MemberAdmin } from "@/auth/decorators/membership-roles.decorator";
import { Public } from "@/auth/decorators/public.decorator";
import { CurrentUser } from "@/auth/decorators/user.decorator";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import {
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
  CreateInvitationRequestDto,
  InvitationResponseDto,
  InvitationsResponseDto,
  SuccessResponseDto,
} from "@/common/swagger/public-api.dto";
import { User } from "@/entities";
import { InvitationsService } from "./invitations.service";

@ApiTags("Invitations")
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @ApiOperation({ summary: "Create an organization invitation" })
  @ApiBearerAuth("bearer")
  @ApiSecurity("apiKey")
  @ApiBody({ type: CreateInvitationRequestDto })
  @ApiCreatedResponse({
    description: "Invitation created successfully",
    type: InvitationResponseDto,
  })
  @Post("org/:orgId/invitations")
  @MemberAdmin()
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

  @ApiOperation({ summary: "List pending invitations for an organization" })
  @ApiBearerAuth("bearer")
  @ApiSecurity("apiKey")
  @ApiOkResponse({
    description: "Invitations fetched successfully",
    type: InvitationsResponseDto,
  })
  @Get("org/:orgId/invitations")
  @MemberAdmin()
  async list(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<InvitationsResponse> {
    const invitations = await this.invitationsService.listByOrg(params.orgId);
    return { invitations } as unknown as InvitationsResponse;
  }

  @ApiOperation({ summary: "Verify an invitation token" })
  @ApiOkResponse({
    description: "Invitation token is valid",
    type: InvitationResponseDto,
  })
  @Public()
  @Get("invitations/verify/:token")
  async verify(
    @Param(new ZodValidationPipe(InvitationVerifyParamSchema))
    params: InvitationVerifyParam
  ): Promise<InvitationResponse> {
    const invitation = await this.invitationsService.findByToken(params.token);
    return { invitation } as unknown as InvitationResponse;
  }

  @ApiOperation({ summary: "Accept an invitation token" })
  @ApiBody({ type: AcceptInvitationRequestDto })
  @ApiCreatedResponse({
    description: "Invitation accepted successfully",
    type: AcceptInvitationResponseDto,
  })
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

  @ApiOperation({ summary: "Revoke an organization invitation" })
  @ApiBearerAuth("bearer")
  @ApiSecurity("apiKey")
  @ApiOkResponse({
    description: "Invitation revoked successfully",
    type: SuccessResponseDto,
  })
  @Delete("org/:orgId/invitations/:invitationId")
  @MemberAdmin()
  async revoke(@Param("invitationId") invitationId: string) {
    await this.invitationsService.revoke(invitationId);
    return { success: true };
  }
}
