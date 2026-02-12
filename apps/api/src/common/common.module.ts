import { Global, Module } from "@nestjs/common";
import { AllExceptionsFilter } from "./filters";
import { LoggingInterceptor, TransformInterceptor } from "./interceptors";
import { AppLogger } from "./logger";
import { EmailService, SecurityAuditService } from "./services";

@Global()
@Module({
  providers: [
    AppLogger,
    EmailService,
    SecurityAuditService,
    AllExceptionsFilter,
    LoggingInterceptor,
    TransformInterceptor,
  ],
  exports: [AppLogger, EmailService, SecurityAuditService],
})
export class CommonModule {}
