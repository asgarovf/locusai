import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailService } from "@/common/services/email.service";
import { Invitation, Membership, Organization, User } from "@/entities";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, Organization, Membership, User]),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService, EmailService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
