import {
  CreateDoc,
  CreateDocSchema,
  DocResponse,
  DocsResponse,
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
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnyMember, Member, MemberAdmin } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { DocsService } from "./docs.service";

@ApiTags("Docs")
@Controller("workspaces/:workspaceId/docs")
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Post()
  @Member()
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
  @AnyMember()
  @ApiOperation({ summary: "List docs by workspace" })
  @ApiOkResponse({ description: "Docs returned successfully." })
  async list(@Param("workspaceId") workspaceId: string): Promise<DocsResponse> {
    const docs = await this.docsService.findByWorkspace(workspaceId);
    return { docs } as unknown as DocsResponse;
  }

  @Get(":docId")
  @AnyMember()
  async getById(@Param("docId") docId: string): Promise<DocResponse> {
    const doc = await this.docsService.findById(docId);
    return { doc } as unknown as DocResponse;
  }

  @Put(":docId")
  @Member()
  async update(
    @Param("docId") docId: string,
    @Body(new ZodValidationPipe(UpdateDocSchema)) body: UpdateDoc
  ): Promise<DocResponse> {
    const doc = await this.docsService.update(docId, body);
    return { doc } as unknown as DocResponse;
  }

  @Delete(":docId")
  @MemberAdmin()
  async delete(@Param("docId") docId: string) {
    await this.docsService.delete(docId);
    return { success: true };
  }
}
