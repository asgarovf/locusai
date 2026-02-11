import { forwardRef, Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AgentRegistration,
  ApiKey,
  Membership,
  Organization,
  Task,
  Workspace,
} from "@/entities";
import { User } from "@/entities/user.entity";
import { EventsModule } from "@/events/events.module";
import { TasksModule } from "@/tasks/tasks.module";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentRegistration,
      Workspace,
      Organization,
      Task,
      Membership,
      ApiKey,
      User,
    ]),
    EventsModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
