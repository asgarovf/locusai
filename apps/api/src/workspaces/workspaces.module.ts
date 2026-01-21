import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Membership, Organization, Task, Workspace } from "@/entities";
import { EventsModule } from "@/events/events.module";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, Organization, Task, Membership]),
    EventsModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
