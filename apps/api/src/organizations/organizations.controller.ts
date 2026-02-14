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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { z } from "zod";
import {
  CurrentUser,
  Member,
  MemberAdmin,
  MemberOwner,
} from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import {
  AddMemberRequestDto,
  ApiKeyCreateResponseDto,
  ApiKeyNameRequestDto,
  ApiKeysResponseDto,
  MembershipResponseDto,
  MembersResponseDto,
  OrganizationResponseDto,
  OrganizationsResponseDto,
  SuccessResponseDto,
} from "@/common/swagger/public-api.dto";
import { User } from "@/entities";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organizations")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: "List organizations available to the current user" })
  @ApiOkResponse({
    description: "Organizations fetched successfully",
    type: OrganizationsResponseDto,
  })
  @Get()
  async list(@CurrentUser() user: User): Promise<OrganizationsResponse> {
    const organizations = await this.organizationsService.findByUser(user.id);
    return { organizations };
  }

  @ApiOperation({ summary: "Get organization details by ID" })
  @ApiOkResponse({
    description: "Organization fetched successfully",
    type: OrganizationResponseDto,
  })
  @Get(":orgId")
  @Member()
  async getById(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationsService.findById(params.orgId);
    return { organization };
  }

  @ApiOperation({ summary: "List organization members" })
  @ApiOkResponse({
    description: "Organization members fetched successfully",
    type: MembersResponseDto,
  })
  @Get(":orgId/members")
  @Member()
  async listMembers(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam
  ): Promise<MembersResponse> {
    const members = await this.organizationsService.getMembers(params.orgId);
    return { members } as unknown as MembersResponse;
  }

  @ApiOperation({ summary: "Add a member to an organization" })
  @ApiBody({ type: AddMemberRequestDto })
  @ApiOkResponse({
    description: "Member added successfully",
    type: MembershipResponseDto,
  })
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

  @ApiOperation({ summary: "Remove a member from an organization" })
  @ApiOkResponse({
    description: "Member removed successfully",
    type: SuccessResponseDto,
  })
  @Delete(":orgId/members/:userId")
  @MemberAdmin()
  async removeMember(
    @Param("orgId") orgId: string,
    @Param("userId") userId: string
  ) {
    await this.organizationsService.removeMember(orgId, userId);
    return { success: true };
  }

  @ApiOperation({ summary: "Delete an organization" })
  @ApiOkResponse({
    description: "Organization deleted successfully",
    type: SuccessResponseDto,
  })
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

  @ApiOperation({ summary: "List API keys for an organization" })
  @ApiOkResponse({
    description: "Organization API keys fetched successfully",
    type: ApiKeysResponseDto,
  })
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

  @ApiOperation({ summary: "Create a new API key for an organization" })
  @ApiBody({ type: ApiKeyNameRequestDto })
  @ApiOkResponse({
    description: "Organization API key created successfully",
    type: ApiKeyCreateResponseDto,
  })
  @Post(":orgId/api-keys")
  @MemberAdmin()
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

  @ApiOperation({ summary: "Delete an organization API key" })
  @ApiOkResponse({
    description: "Organization API key deleted successfully",
    type: SuccessResponseDto,
  })
  @Delete(":orgId/api-keys/:keyId")
  @MemberAdmin()
  async deleteApiKey(
    @Param("orgId") orgId: string,
    @Param("keyId") keyId: string
  ) {
    await this.organizationsService.deleteApiKey(orgId, keyId);
    return { success: true };
  }
}
