import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppLogger } from "./common/logger";
import { TypedConfigService } from "./config/config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.setGlobalPrefix("api");

  const configService = app.get(TypedConfigService);

  // Enable CORS with configuration
  const corsOrigin = configService.get("CORS_ORIGIN");
  app.enableCors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(","),
    credentials: true,
  });

  const port = configService.get("PORT");
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}`,
    "Bootstrap"
  );
}
bootstrap();
