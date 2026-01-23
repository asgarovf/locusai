import {
  CreateDoc,
  CreateDocSchema,
  DocResponse,
  DocsResponse,
  MembershipRole,
  UpdateDoc,
  UpdateDocSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { MembershipRoles } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { DocsService } from "./docs.service";

@Controller("workspaces/:workspaceId/docs")
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Post()
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreateDocSchema)) body: CreateDoc
  ): Promise<DocResponse> {
    const doc = await this.docsService.create({
      ...body,
      workspaceId,
    });
    return { doc } as unknown as DocResponse;
  }

  @Get()
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
    MembershipRole.VIEWER
  )
  async list(@Param("workspaceId") workspaceId: string): Promise<DocsResponse> {
    const docs = await this.docsService.findByWorkspace(workspaceId);
    return { docs } as unknown as DocsResponse;
  }

  @Get(":docId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
    MembershipRole.VIEWER
  )
  async getById(@Param("docId") docId: string): Promise<DocResponse> {
    const doc = await this.docsService.findById(docId);
    return { doc } as unknown as DocResponse;
  }

  @Put(":docId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
  async update(
    @Param("docId") docId: string,
    @Body(new ZodValidationPipe(UpdateDocSchema)) body: UpdateDoc
  ): Promise<DocResponse> {
    const doc = await this.docsService.update(docId, body);
    return { doc } as unknown as DocResponse;
  }

  @Delete(":docId")
  @MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN)
  async delete(@Param("docId") docId: string) {
    await this.docsService.delete(docId);
    return { success: true };
  }
}
