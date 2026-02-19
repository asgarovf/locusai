import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "@/common/common.module";
import { TypedConfigService } from "@/config/config.service";
import { AwsCredential } from "@/entities/aws-credential.entity";
import { AwsInstance } from "@/entities/aws-instance.entity";
import { OrganizationsModule } from "@/organizations/organizations.module";
import { UsersModule } from "@/users/users.module";
import { WorkspacesModule } from "@/workspaces/workspaces.module";
import { AwsCredentialsController } from "./aws-credentials.controller";
import { AwsCredentialsService } from "./aws-credentials.service";
import { AwsEc2Service } from "./aws-ec2.service";
import { AwsInstancesController } from "./aws-instances.controller";
import { AwsInstancesService } from "./aws-instances.service";
import { AwsTerminalGateway } from "./aws-terminal.gateway";
import { AwsUpdatesService } from "./aws-updates.service";

@Module({
  imports: [
    CommonModule,
    UsersModule,
    WorkspacesModule,
    OrganizationsModule,
    TypeOrmModule.forFeature([AwsCredential, AwsInstance]),
    JwtModule.registerAsync({
      inject: [TypedConfigService],
      useFactory: (configService: TypedConfigService) => ({
        secret: configService.get("JWT_SECRET"),
      }),
    }),
  ],
  controllers: [AwsCredentialsController, AwsInstancesController],
  providers: [
    AwsEc2Service,
    AwsCredentialsService,
    AwsInstancesService,
    AwsTerminalGateway,
    AwsUpdatesService,
  ],
  exports: [AwsEc2Service, AwsCredentialsService, AwsInstancesService],
})
export class AwsModule {}
