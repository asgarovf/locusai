import { forwardRef, Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKey, Membership, Organization, Task, Workspace } from "@/entities";
import { EventsModule } from "@/events/events.module";
import { TasksModule } from "@/tasks/tasks.module";
import { InterviewAnalyticsService } from "./interview-analytics.service";
import { ManifestValidatorService } from "./manifest-validator.service";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      Organization,
      Task,
      Membership,
      ApiKey, // Added ApiKey repository
    ]),
    EventsModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    ManifestValidatorService,
    InterviewAnalyticsService,
  ],
  exports: [
    WorkspacesService,
    ManifestValidatorService,
    InterviewAnalyticsService,
  ],
})
export class WorkspacesModule {}
