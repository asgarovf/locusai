import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AppLogger } from "./common/logger";
import { TypedConfigService } from "./config/config.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Configure body-parser size limits to prevent DoS attacks
  // JSON body limit: 1MB
  app.use(express.json({ limit: "1mb" }));
  // URL-encoded body limit: 1MB
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  // Raw body limit: 5MB (for file uploads)
  app.use(express.raw({ limit: "5mb" }));

  // Configure cookie-parser for secure cookie handling
  const configService = app.get(TypedConfigService);
  const cookieSecret = configService.get("COOKIE_SECRET");
  app.use(cookieParser(cookieSecret));

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  // Use helmet for security headers with strict configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      xFrameOptions: { action: "deny" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // Set Permissions-Policy header (not included in helmet v8)
  app.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)"
    );
    next();
  });

  app.setGlobalPrefix("api");

  // Enable CORS with configuration
  const corsOrigin = configService.get("CORS_ORIGIN");
  app.enableCors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(","),
    credentials: true,
  });

  // Configure HTTP server-level timeouts to prevent slow loris attacks
  const requestTimeout = configService.get("REQUEST_TIMEOUT");
  const server = app.getHttpServer();
  server.setTimeout(requestTimeout);
  server.keepAliveTimeout = requestTimeout;
  server.headersTimeout = requestTimeout + 1000; // Must be greater than keepAliveTimeout

  const port = configService.get("PORT");
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}`,
    "Bootstrap"
  );
}
bootstrap();
