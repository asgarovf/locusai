import { Module } from "@nestjs/common";
import { EventsModule } from "@/events/events.module";
import { CiController } from "./ci.controller";
import { CiService } from "./ci.service";

@Module({
  imports: [EventsModule],
  controllers: [CiController],
  providers: [CiService],
  exports: [CiService],
})
export class CiModule {}
