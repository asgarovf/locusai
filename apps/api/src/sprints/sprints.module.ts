import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiModule } from "@/ai/ai.module";
import { Sprint } from "@/entities/sprint.entity";
import { TasksModule } from "@/tasks/tasks.module";
import { SPRINTS_SERVICE_TOKEN } from "./sprints.constants";
import { SprintsController } from "./sprints.controller";
import { SprintsService } from "./sprints.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Sprint]),
    forwardRef(() => AiModule),
    TasksModule,
  ],
  controllers: [SprintsController],
  providers: [
    SprintsService,
    { provide: SPRINTS_SERVICE_TOKEN, useExisting: SprintsService },
  ],
  exports: [SprintsService, SPRINTS_SERVICE_TOKEN],
})
export class SprintsModule {}
