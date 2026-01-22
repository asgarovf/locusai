import {
  CreateDocGroup,
  CreateDocGroupSchema,
  DocGroupResponse,
  DocGroupsResponse,
  MembershipRole,
  UpdateDocGroup,
  UpdateDocGroupSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { MembershipRoles } from "@/auth/decorators";
import { MembershipRolesGuard } from "@/auth/guards";
import { ZodValidationPipe } from "@/common/pipes";
import { DocGroupsService } from "./doc-groups.service";

@Controller("workspaces/:workspaceId/doc-groups")
@UseGuards(MembershipRolesGuard)
export class DocGroupsController {
  constructor(private readonly docGroupsService: DocGroupsService) {}

  @Get()
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async list(
    @Param("workspaceId") workspaceId: string
  ): Promise<DocGroupsResponse> {
    const groups = await this.docGroupsService.findAll(workspaceId);
    return { groups };
  }

  @Post()
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreateDocGroupSchema)) body: CreateDocGroup
  ): Promise<DocGroupResponse> {
    const group = await this.docGroupsService.create({
      name: body.name,
      order: body.order,
      workspaceId,
    });
    return { group };
  }

  @Patch(":id")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateDocGroupSchema)) body: UpdateDocGroup
  ): Promise<DocGroupResponse> {
    const group = await this.docGroupsService.update(id, body);
    return { group };
  }

  @Delete(":id")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async delete(@Param("id") id: string) {
    await this.docGroupsService.delete(id);
    return { success: true };
  }
}
