import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { DataSource } from "typeorm";
import { Public } from "../auth/decorators/public.decorator";
import { HealthCheckResponseDto } from "./dto/health-check-response.dto";

@SkipThrottle()
@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Service health check" })
  @ApiOkResponse({ type: HealthCheckResponseDto })
  async check(): Promise<HealthCheckResponseDto> {
    let dbStatus: "up" | "down" = "up";
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
