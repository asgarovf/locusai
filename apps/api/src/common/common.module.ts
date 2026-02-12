import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SecurityAuditLog } from "@/entities/security-audit-log.entity";
import { AllExceptionsFilter } from "./filters";
import {
  LoggingInterceptor,
  SanitizeInterceptor,
  TransformInterceptor,
} from "./interceptors";
import { AppLogger } from "./logger";
import { RequestIdMiddleware } from "./middleware/request-id.middleware";
import { EmailService, SecurityAuditService } from "./services";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SecurityAuditLog])],
  providers: [
    AppLogger,
    EmailService,
    SecurityAuditService,
    AllExceptionsFilter,
    LoggingInterceptor,
    SanitizeInterceptor,
    TransformInterceptor,
  ],
  exports: [AppLogger, EmailService, SecurityAuditService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
