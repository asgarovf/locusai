import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AppLogger } from "./common/logger";
import { TypedConfigService } from "./config/config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const configService = app.get(TypedConfigService);
  const isProduction = configService.get("NODE_ENV") === "production";

  // Trust Railway's reverse proxy for correct X-Forwarded-For IP extraction
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", true);

  // Body parser limits to prevent large-payload attacks
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ limit: "1mb", extended: true }));

  // Helmet security headers
  app.use(
    helmet({
      // CSP disabled: this is an API-only server with no HTML responses
      contentSecurityPolicy: false,
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
    })
  );

  app.setGlobalPrefix("api");

  // CORS configuration
  const corsOrigin = configService.get("CORS_ORIGIN");

  if (isProduction && corsOrigin === "*") {
    throw new Error(
      "CORS_ORIGIN must be explicitly set in production (wildcard '*' is not allowed)"
    );
  }

  app.enableCors({
    origin: isProduction ? corsOrigin.split(",") : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-API-Key",
      "X-Request-ID",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "X-Request-ID",
    ],
    maxAge: 86400,
  });

  const port = configService.get("PORT");
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}`,
    "Bootstrap"
  );
}
bootstrap();
