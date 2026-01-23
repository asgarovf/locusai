import { Global, Module } from "@nestjs/common";
import { AllExceptionsFilter } from "./filters";
import { LoggingInterceptor, TransformInterceptor } from "./interceptors";
import { AppLogger } from "./logger";
import { EmailService } from "./services";

@Global()
@Module({
  providers: [
    AppLogger,
    EmailService,
    AllExceptionsFilter,
    LoggingInterceptor,
    TransformInterceptor,
  ],
  exports: [AppLogger, EmailService],
})
export class CommonModule {}
