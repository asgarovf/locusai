import { Module } from "@nestjs/common";
import { CommonModule } from "@/common/common.module";
import { AwsEc2Service } from "./aws-ec2.service";

@Module({
  imports: [CommonModule],
  providers: [AwsEc2Service],
  exports: [AwsEc2Service],
})
export class AwsModule {}
