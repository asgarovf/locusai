import { ApiProperty } from "@nestjs/swagger";

class HealthServicesResponseDto {
  @ApiProperty({
    description: "Database connectivity state.",
    example: "up",
    enum: ["up", "down"],
  })
  database!: "up" | "down";
}

export class HealthCheckResponseDto {
  @ApiProperty({
    description: "Overall service status derived from dependency health.",
    example: "ok",
    enum: ["ok", "error"],
  })
  status!: "ok" | "error";

  @ApiProperty({
    description: "Health status for individual backend dependencies.",
    type: HealthServicesResponseDto,
  })
  services!: HealthServicesResponseDto;
}
