import {
  AddMember,
  AddMemberSchema,
  AuthenticatedUser,
  getAuthUserId,
  MembershipResponse,
  MembersResponse,
  OrganizationResponse,
  OrganizationsResponse,
  OrgIdParam,
  OrgIdParamSchema,
  SecurityAuditEventType,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { z } from "zod";
import {
  CurrentUser,
  Member,
  MemberAdmin,
  MemberOwner,
} from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { SecurityAuditService } from "@/common/services/security-audit.service";
import { User } from "@/entities";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<OrganizationsResponse> {
    const organizations = await this.organizationsService.findByUser(user.id);
    return { organizations };
  }

  @Get(":orgId")
  @Member()
  async getById(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationsService.findById(params.orgId);
    return { organization };
  }

  @Get(":orgId/members")
  @Member()
  async listMembers(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<MembersResponse> {
    const members = await this.organizationsService.getMembers(params.orgId);
    return { members } as unknown as MembersResponse;
  }

  @Post(":orgId/members")
  @MemberAdmin()
  async addMember(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(AddMemberSchema)) body: AddMember
  ): Promise<MembershipResponse> {
    const membership = await this.organizationsService.addMember(
      params.orgId,
      body
    );
    return { membership } as unknown as MembershipResponse;
  }

  @Delete(":orgId/members/:userId")
  @MemberAdmin()
  async removeMember(
    @Param("orgId") orgId: string,
    @Param("userId") userId: string
  ) {
    await this.organizationsService.removeMember(orgId, userId);
    return { success: true };
  }

  @Delete(":orgId")
  @MemberOwner()
  async delete(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ) {
    await this.organizationsService.delete(params.orgId);
    return { success: true };
  }

  // ============================================================================
  // API Key Management
  // ============================================================================

  @Get(":orgId/api-keys")
  @MemberAdmin()
  async listApiKeys(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ) {
    const apiKeys = await this.organizationsService.listApiKeys(params.orgId);

    const maskedKeys = apiKeys.map((apiKey) => {
      const { keyHash: _, ...rest } = apiKey;
      return {
        ...rest,
        key: `${apiKey.keyPrefix}...`,
      };
    });
    return { apiKeys: maskedKeys };
  }

  @Post(":orgId/api-keys")
  @MemberAdmin()
  async createApiKey(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(z.object({ name: z.string().min(1).max(100) })))
    body: { name: string }
  ) {
    const { apiKey, key } = await this.organizationsService.createApiKey(
      params.orgId,
      body.name
    );

    await this.securityAuditService.log({
      eventType: SecurityAuditEventType.API_KEY_CREATED,
      userId: getAuthUserId(user) ?? undefined,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      requestId: req.requestId,
      metadata: {
        keyName: body.name,
        keyId: apiKey.id,
        orgId: params.orgId,
      },
    });

    const { keyHash: _, ...rest } = apiKey;

    // Return full key only on creation
    return {
      apiKey: {
        ...rest,
        key, // Full key returned only once
      },
    };
  }

  @Delete(":orgId/api-keys/:keyId")
  @MemberAdmin()
  async deleteApiKey(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Param("orgId") orgId: string,
    @Param("keyId") keyId: string
  ) {
    await this.organizationsService.deleteApiKey(orgId, keyId);

    await this.securityAuditService.log({
      eventType: SecurityAuditEventType.API_KEY_DELETED,
      userId: getAuthUserId(user) ?? undefined,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      requestId: req.requestId,
      metadata: {
        keyId,
        orgId,
      },
    });

    return { success: true };
  }
}
