import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Public } from "../auth/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Public()
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
