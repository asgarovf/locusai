import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiModule } from "./ai/ai.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { AuthModule } from "./auth/auth.module";
import {
  CsrfGuard,
  IpBlockGuard,
  JwtOrApiKeyGuard,
  MembershipRolesGuard,
} from "./auth/guards";
import { CiModule } from "./ci/ci.module";
import { CommonModule } from "./common/common.module";
import { AllExceptionsFilter } from "./common/filters";
import { CustomThrottleGuard } from "./common/guards";
import {
  AuditLogInterceptor,
  LoggingInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
} from "./common/interceptors";
import { SanitizeMiddleware } from "./common/middleware";
import { ConfigModule } from "./config/config.module";
import { TypedConfigService } from "./config/config.service";
import { DocsModule } from "./docs/docs.module";
import { ApiKey } from "./entities/api-key.entity";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { SprintsModule } from "./sprints/sprints.module";
import { TasksModule } from "./tasks/tasks.module";
import { UploadsModule } from "./uploads/uploads.module";
import { UsersModule } from "./users/users.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";

@Module({
  imports: [
    // TypeORM Module
    TypeOrmModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (configService: TypedConfigService) => ({
        type: "postgres",
        url: configService.get("DATABASE_URL"),
        synchronize: configService.get("DATABASE_SYNC") === "true",
        autoLoadEntities: true,
      }),
    }),

    // Register entities for global use
    TypeOrmModule.forFeature([ApiKey]),

    // Schedule Module for cron jobs
    ScheduleModule.forRoot(),

    // Throttler Module for rate limiting
    ThrottlerModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (configService: TypedConfigService) => ({
        throttlers: [
          {
            ttl: configService.get("THROTTLE_TTL"),
            limit: configService.get("THROTTLE_LIMIT"),
          },
        ],
        // Include rate limit headers in all responses:
        // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
        setHeaders: true,
      }),
    }),

    // Global Modules
    CommonModule,
    AuthModule,
    ConfigModule,
    HealthModule,
    EventsModule,
    AuditLogsModule,

    // Defined Modules
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    TasksModule,
    SprintsModule,
    InvitationsModule,
    DocsModule,
    CiModule,
    AiModule,
    UploadsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: IpBlockGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtOrApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MembershipRolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SanitizeMiddleware).forRoutes("*");
  }
}
