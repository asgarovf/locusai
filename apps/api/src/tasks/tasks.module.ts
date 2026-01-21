import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Artifact, Comment, Task } from "@/entities";
import { TaskProcessor } from "./task.processor";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [TypeOrmModule.forFeature([Task, Comment, Artifact])],
  controllers: [TasksController],
  providers: [TasksService, TaskProcessor],
  exports: [TasksService],
})
export class TasksModule {}
