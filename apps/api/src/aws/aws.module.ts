import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "@/common/common.module";
import { AwsCredential } from "@/entities/aws-credential.entity";
import { AwsInstance } from "@/entities/aws-instance.entity";
import { AwsCredentialsController } from "./aws-credentials.controller";
import { AwsCredentialsService } from "./aws-credentials.service";
import { AwsEc2Service } from "./aws-ec2.service";
import { AwsInstancesController } from "./aws-instances.controller";
import { AwsInstancesService } from "./aws-instances.service";

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([AwsCredential, AwsInstance]),
  ],
  controllers: [AwsCredentialsController, AwsInstancesController],
  providers: [AwsEc2Service, AwsCredentialsService, AwsInstancesService],
  exports: [AwsEc2Service, AwsCredentialsService, AwsInstancesService],
})
export class AwsModule {}
