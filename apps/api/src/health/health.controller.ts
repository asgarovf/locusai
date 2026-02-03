import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import { SkipIpBlock } from "@/common/decorators";
import { Public } from "../auth/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Public()
  @SkipIpBlock()
  @Get()
  async check() {
    let dbStatus = "up";
    try {
      await this.dataSource.query("SELECT 1");
    } catch {
      dbStatus = "down";
    }

    return {
      status: dbStatus === "up" ? "ok" : "error",
      services: {
        database: dbStatus,
      },
    };
  }
}
