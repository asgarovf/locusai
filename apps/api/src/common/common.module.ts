import { Global, Module } from "@nestjs/common";
import { AllExceptionsFilter } from "./filters";
import {
  LoggingInterceptor,
  SanitizeInterceptor,
  TransformInterceptor,
} from "./interceptors";
import { AppLogger } from "./logger";
import { EmailService, EncryptionService } from "./services";

@Global()
@Module({
  providers: [
    AppLogger,
    EmailService,
    EncryptionService,
    AllExceptionsFilter,
    LoggingInterceptor,
    SanitizeInterceptor,
    TransformInterceptor,
  ],
  exports: [AppLogger, EmailService, EncryptionService],
})
export class CommonModule {}
