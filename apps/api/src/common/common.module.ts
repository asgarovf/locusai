import { Global, Module } from "@nestjs/common";
import { AllExceptionsFilter } from "./filters";
import { LoggingInterceptor, TransformInterceptor } from "./interceptors";
import { AppLogger } from "./logger";
import {
  AccountLockoutService,
  EmailService,
  IpReputationService,
  SecurityAuditService,
} from "./services";

@Global()
@Module({
  providers: [
    AppLogger,
    EmailService,
    AccountLockoutService,
    IpReputationService,
    SecurityAuditService,
    AllExceptionsFilter,
    LoggingInterceptor,
    TransformInterceptor,
  ],
  exports: [
    AppLogger,
    EmailService,
    AccountLockoutService,
    IpReputationService,
    SecurityAuditService,
  ],
})
export class CommonModule {}
