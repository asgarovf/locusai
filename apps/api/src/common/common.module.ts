import { Global, Module } from "@nestjs/common";
import { AllExceptionsFilter } from "./filters";
import {
  LoggingInterceptor,
  SanitizeInterceptor,
  TransformInterceptor,
} from "./interceptors";
import { AppLogger } from "./logger";
import { EmailService } from "./services";

@Global()
@Module({
  providers: [
    AppLogger,
    EmailService,
    AllExceptionsFilter,
    LoggingInterceptor,
    SanitizeInterceptor,
    TransformInterceptor,
  ],
  exports: [AppLogger, EmailService],
})
export class CommonModule {}
