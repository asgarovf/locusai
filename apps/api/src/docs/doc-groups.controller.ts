import {
  CreateDocGroup,
  CreateDocGroupSchema,
  DocGroupResponse,
  DocGroupsResponse,
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
} from "@nestjs/common";
import { AnyMember, MemberAdmin } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { DocGroupsService } from "./doc-groups.service";

@Controller("workspaces/:workspaceId/doc-groups")
export class DocGroupsController {
  constructor(private readonly docGroupsService: DocGroupsService) {}

  @Get()
  @AnyMember()
  async list(
    @Param("workspaceId") workspaceId: string
  ): Promise<DocGroupsResponse> {
    const groups = await this.docGroupsService.findAll(workspaceId);
    return { groups };
  }

  @Post()
  @MemberAdmin()
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
  @MemberAdmin()
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateDocGroupSchema)) body: UpdateDocGroup
  ): Promise<DocGroupResponse> {
    const group = await this.docGroupsService.update(id, body);
    return { group };
  }

  @Delete(":id")
  @MemberAdmin()
  async delete(@Param("id") id: string) {
    await this.docGroupsService.delete(id);
    return { success: true };
  }
}
