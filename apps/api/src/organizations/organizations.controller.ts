import {
  AddMember,
  AddMemberSchema,
  MembershipResponse,
  MembershipRole,
  MembersResponse,
  OrganizationResponse,
  OrganizationsResponse,
  OrgIdParam,
  OrgIdParamSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, MembershipRoles } from "@/auth/decorators";
import { MembershipRolesGuard } from "@/auth/guards";
import { ZodValidationPipe } from "@/common/pipes";
import { User } from "@/entities";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(MembershipRolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<OrganizationsResponse> {
    const organizations = await this.organizationsService.findByUser(user.id);
    return { organizations };
  }

  @Get(":orgId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async getById(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationsService.findById(params.orgId);
    return { organization };
  }

  @Get(":orgId/members")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async listMembers(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<MembersResponse> {
    const members = await this.organizationsService.getMembers(params.orgId);
    return { members } as unknown as MembersResponse;
  }

  @Post(":orgId/members")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
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
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async removeMember(
    @Param("orgId") orgId: string,
    @Param("userId") userId: string
  ) {
    await this.organizationsService.removeMember(orgId, userId);
    return { success: true };
  }

  @Delete(":orgId")
  @MembershipRoles(MembershipRole.OWNER)
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
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async listApiKeys(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ) {
    const apiKeys = await this.organizationsService.listApiKeys(params.orgId);
    // Mask the keys for security (show only first 8 and last 4 chars)
    const maskedKeys = apiKeys.map((key) => ({
      ...key,
      key: this.maskApiKey(key.key),
    }));
    return { apiKeys: maskedKeys };
  }

  @Post(":orgId/api-keys")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async createApiKey(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(z.object({ name: z.string().min(1).max(100) })))
    body: { name: string }
  ) {
    const { apiKey, key } = await this.organizationsService.createApiKey(
      params.orgId,
      body.name
    );
    // Return full key only on creation
    return {
      apiKey: {
        ...apiKey,
        key, // Full key returned only once
      },
    };
  }

  @Delete(":orgId/api-keys/:keyId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async deleteApiKey(
    @Param("orgId") orgId: string,
    @Param("keyId") keyId: string
  ) {
    await this.organizationsService.deleteApiKey(orgId, keyId);
    return { success: true };
  }

  private maskApiKey(key: string): string {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  }
}
