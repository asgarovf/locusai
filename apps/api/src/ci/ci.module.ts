import { Module } from "@nestjs/common";
import { EventsModule } from "@/events/events.module";
import { OrganizationsModule } from "@/organizations/organizations.module";
import { WorkspacesModule } from "@/workspaces/workspaces.module";
import { CiController } from "./ci.controller";
import { CiService } from "./ci.service";

@Module({
  imports: [EventsModule, OrganizationsModule, WorkspacesModule],
  controllers: [CiController],
  providers: [CiService],
  exports: [CiService],
})
export class CiModule {}
