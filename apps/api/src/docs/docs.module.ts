import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Doc } from "@/entities/doc.entity";
import { DocsController } from "./docs.controller";
import { DocsService } from "./docs.service";

@Module({
  imports: [TypeOrmModule.forFeature([Doc])],
  controllers: [DocsController],
  providers: [DocsService],
  exports: [DocsService],
})
export class DocsModule {}
