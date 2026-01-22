import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Doc, DocGroup } from "@/entities";
import { DocGroupsController } from "./doc-groups.controller";
import { DocGroupsService } from "./doc-groups.service";
import { DocsController } from "./docs.controller";
import { DocsService } from "./docs.service";

@Module({
  imports: [TypeOrmModule.forFeature([Doc, DocGroup])],
  controllers: [DocsController, DocGroupsController],
  providers: [DocsService, DocGroupsService],
  exports: [DocsService, DocGroupsService],
})
export class DocsModule {}
