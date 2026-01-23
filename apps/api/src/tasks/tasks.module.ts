import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment, Doc, DocGroup, Task } from "@/entities";
import { WorkspacesModule } from "@/workspaces/workspaces.module";
import { TaskProcessor } from "./task.processor";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment, Doc, DocGroup]),
    forwardRef(() => WorkspacesModule),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskProcessor],
  exports: [TasksService],
})
export class TasksModule {}
