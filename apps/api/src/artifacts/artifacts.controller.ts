import {
  ArtifactResponse,
  ArtifactsResponse,
  CreateArtifact,
  CreateArtifactSchema,
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
import { CurrentUser } from "@/auth/decorators";
import { JwtAuthGuard } from "@/auth/guards";
import { ZodValidationPipe } from "@/common/pipes";
import { User } from "@/entities";
import { ArtifactsService } from "./artifacts.service";

@Controller("workspaces/:workspaceId/tasks/:taskId/artifacts")
@UseGuards(JwtAuthGuard)
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post()
  async create(
    @Param("taskId") taskId: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(CreateArtifactSchema)) body: CreateArtifact
  ): Promise<ArtifactResponse> {
    const artifact = await this.artifactsService.create(
      { ...body, taskId },
      user.id
    );
    return { artifact } as unknown as ArtifactResponse;
  }

  @Get()
  async list(@Param("taskId") taskId: string): Promise<ArtifactsResponse> {
    const artifacts = await this.artifactsService.listByTask(taskId);
    return { artifacts } as unknown as ArtifactsResponse;
  }

  @Get(":artifactId")
  async getById(
    @Param("artifactId") artifactId: string
  ): Promise<ArtifactResponse> {
    const artifact = await this.artifactsService.findById(artifactId);
    return { artifact } as unknown as ArtifactResponse;
  }

  @Delete(":artifactId")
  async delete(@Param("artifactId") artifactId: string) {
    await this.artifactsService.delete(artifactId);
    return { success: true };
  }
}
