import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiModule } from "@/ai/ai.module";
import { Sprint } from "@/entities/sprint.entity";
import { TasksModule } from "@/tasks/tasks.module";
import { SprintsController } from "./sprints.controller";
import { SprintsService } from "./sprints.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Sprint]),
    forwardRef(() => AiModule),
    TasksModule,
  ],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
