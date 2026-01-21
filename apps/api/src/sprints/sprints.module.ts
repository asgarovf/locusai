import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Sprint } from "@/entities/sprint.entity";
import { SprintsController } from "./sprints.controller";
import { SprintsService } from "./sprints.service";

@Module({
  imports: [TypeOrmModule.forFeature([Sprint])],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
