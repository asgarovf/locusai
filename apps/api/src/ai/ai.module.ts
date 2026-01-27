import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "../config/config.module";
import { DocsModule } from "../docs/docs.module";
import { AiSession } from "../entities/ai-session.entity";
import { Workspace } from "../entities/workspace.entity";
import { SprintsModule } from "../sprints/sprints.module";
import { TasksModule } from "../tasks/tasks.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([AiSession, Workspace]),
    ConfigModule,
    TasksModule,
    DocsModule,
    forwardRef(() => SprintsModule),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
