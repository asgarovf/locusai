import {
  type InstanceActionBody,
  InstanceActionBodySchema,
  type InstanceIdParam,
  InstanceIdParamSchema,
  type ProvisionAwsInstance,
  ProvisionAwsInstanceSchema,
  WorkspaceIdParam,
  WorkspaceIdParamSchema,
} from "@locusai/shared";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Member } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { AwsInstancesService } from "./aws-instances.service";
import { AwsUpdatesService } from "./aws-updates.service";

@ApiTags("AWS Instances")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("workspaces/:workspaceId/aws-instances")
export class AwsInstancesController {
  constructor(
    private readonly awsInstancesService: AwsInstancesService,
    private readonly awsUpdatesService: AwsUpdatesService
  ) {}

  @Post()
  @Member()
  async provisionInstance(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam,
    @Body(new ZodValidationPipe(ProvisionAwsInstanceSchema))
    body: ProvisionAwsInstance
  ) {
    const instance = await this.awsInstancesService.provisionInstance(
      params.workspaceId,
      body
    );
    return { instance };
  }

  @Get()
  @Member()
  async listInstances(
    @Param(new ZodValidationPipe(WorkspaceIdParamSchema))
    params: WorkspaceIdParam
  ) {
    const instances = await this.awsInstancesService.listInstances(
      params.workspaceId
    );
    return { instances };
  }

  @Get(":instanceId")
  @Member()
  async getInstance(
    @Param(new ZodValidationPipe(InstanceIdParamSchema))
    params: InstanceIdParam
  ) {
    const instance = await this.awsInstancesService.getInstance(
      params.workspaceId,
      params.instanceId
    );
    return { instance };
  }

  @Post(":instanceId/actions")
  @Member()
  async performAction(
    @Param(new ZodValidationPipe(InstanceIdParamSchema))
    params: InstanceIdParam,
    @Body(new ZodValidationPipe(InstanceActionBodySchema))
    body: InstanceActionBody
  ) {
    const instance = await this.awsInstancesService.performAction(
      params.workspaceId,
      params.instanceId,
      body.action
    );
    return { instance };
  }

  @Post(":instanceId/sync")
  @Member()
  async syncInstanceStatus(
    @Param(new ZodValidationPipe(InstanceIdParamSchema))
    params: InstanceIdParam
  ) {
    const instance = await this.awsInstancesService.syncInstanceStatus(
      params.workspaceId,
      params.instanceId
    );
    return { instance };
  }

  @Get(":instanceId/updates")
  @Member()
  async checkForUpdates(
    @Param(new ZodValidationPipe(InstanceIdParamSchema))
    params: InstanceIdParam
  ) {
    const update = await this.awsUpdatesService.checkForUpdates(
      params.workspaceId,
      params.instanceId
    );
    return { update };
  }

  @Post(":instanceId/updates")
  @Member()
  async applyUpdate(
    @Param(new ZodValidationPipe(InstanceIdParamSchema))
    params: InstanceIdParam
  ) {
    const update = await this.awsUpdatesService.applyUpdate(
      params.workspaceId,
      params.instanceId
    );
    return { update };
  }
}
