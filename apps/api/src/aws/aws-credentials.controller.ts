import {
  SaveAwsCredentials,
  SaveAwsCredentialsSchema,
  WorkspaceIdParam,
  WorkspaceIdParamSchema,
} from "@locusai/shared";
import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Member } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { AwsCredentialsService } from "./aws-credentials.service";

@ApiTags("AWS Credentials")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("workspaces/:workspaceId/aws-credentials")
export class AwsCredentialsController {
  constructor(private readonly awsCredentialsService: AwsCredentialsService) {}

  @Put()
  @Member()
  async saveCredentials(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam,
    @Body(new ZodValidationPipe(SaveAwsCredentialsSchema))
    body: SaveAwsCredentials
  ) {
    const credential = await this.awsCredentialsService.saveCredentials(
      params.workspaceId,
      body
    );
    return { credential };
  }

  @Get()
  @Member()
  async getCredentials(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    const credential = await this.awsCredentialsService.getCredentials(
      params.workspaceId
    );
    return { credential };
  }

  @Delete()
  @Member()
  async deleteCredentials(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    await this.awsCredentialsService.deleteCredentials(params.workspaceId);
    return { success: true };
  }
}
