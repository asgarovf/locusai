import {
  AddMember,
  AddMemberSchema,
  MembershipResponse,
  MembersResponse,
  OrganizationResponse,
  OrganizationsResponse,
  OrgIdParam,
  OrgIdParamSchema,
} from "@locusai/shared";
import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import {
  CurrentUser,
  Member,
  MemberAdmin,
  MemberOwner,
} from "@/auth/decorators";
import { AuditLog } from "@/common/decorators/audit-log.decorator";
import {
  byUserId,
  CustomThrottle,
} from "@/common/decorators/custom-throttle.decorator";
import { ZodValidationPipe } from "@/common/pipes";
import { User } from "@/entities";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
  @AuditLog("MEMBER_ADD", "organization")
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
  @AuditLog("MEMBER_REMOVE", "organization")
  async removeMember(
    @Param("orgId") orgId: string,
    @Param("userId") userId: string
  ) {
    await this.organizationsService.removeMember(orgId, userId);
    return { success: true };
  }

  @Delete(":orgId")
  @MemberOwner()
  @AuditLog("ORGANIZATION_DELETE", "organization")
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
  @CustomThrottle({ limit: 20, ttl: 60000, keyGenerator: byUserId() })
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
  @CustomThrottle({ limit: 20, ttl: 60000, keyGenerator: byUserId() })
  @AuditLog("API_KEY_CREATE", "organization")
  async createApiKey(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(z.object({ name: z.string().min(1).max(100) })))
    body: { name: string }
  ) {
    const { apiKey, key } = await this.organizationsService.createApiKey(
      params.orgId,
      body.name
    );

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
  @CustomThrottle({ limit: 20, ttl: 60000, keyGenerator: byUserId() })
  @AuditLog("API_KEY_DELETE", "organization")
  async deleteApiKey(
    @Param("orgId") orgId: string,
    @Param("keyId") keyId: string
  ) {
    await this.organizationsService.deleteApiKey(orgId, keyId);
    return { success: true };
  }
}
