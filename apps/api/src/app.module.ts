import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { JwtOrApiKeyGuard, MembershipRolesGuard } from "./auth/guards";
import { AwsModule } from "./aws/aws.module";
import { CiModule } from "./ci/ci.module";
import { CommonModule } from "./common/common.module";
import { AllExceptionsFilter } from "./common/filters";
import {
  LoggingInterceptor,
  SanitizeInterceptor,
  TransformInterceptor,
} from "./common/interceptors";
import { ConfigModule } from "./config/config.module";
import { TypedConfigService } from "./config/config.service";
import { DocsModule } from "./docs/docs.module";
import { ApiKey } from "./entities/api-key.entity";
import { Suggestion } from "./entities/suggestion.entity";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { InvitationsModule } from "./invitations/invitations.module";

import { OrganizationsModule } from "./organizations/organizations.module";
import { SprintsModule } from "./sprints/sprints.module";
import { SuggestionsModule } from "./suggestions/suggestions.module";
import { TasksModule } from "./tasks/tasks.module";
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
    TypeOrmModule.forFeature([ApiKey, Suggestion]),

    // Throttler Module for rate limiting
    ThrottlerModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (configService: TypedConfigService) => ({
        throttlers: [
          {
            ttl: configService.get("THROTTLE_TTL") * 1000,
            limit: configService.get("THROTTLE_LIMIT"),
          },
        ],
      }),
    }),

    // Schedule Module for cron jobs
    ScheduleModule.forRoot(),

    // Global Modules
    CommonModule,
    AuthModule,
    ConfigModule,
    HealthModule,
    EventsModule,

    // Defined Modules
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    TasksModule,
    SprintsModule,
    InvitationsModule,
    SuggestionsModule,
    DocsModule,
    CiModule,
    AwsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtOrApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MembershipRolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeInterceptor,
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
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
