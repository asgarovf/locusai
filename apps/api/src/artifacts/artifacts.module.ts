import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Artifact, Task } from "@/entities";
import { ArtifactsController } from "./artifacts.controller";
import { ArtifactsService } from "./artifacts.service";

@Module({
  imports: [TypeOrmModule.forFeature([Artifact, Task])],
  controllers: [ArtifactsController],
  providers: [ArtifactsService],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
