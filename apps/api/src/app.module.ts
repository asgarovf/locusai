import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ArtifactsModule } from "./artifacts/artifacts.module";
import { AuthModule } from "./auth/auth.module";
import { CiModule } from "./ci/ci.module";
import { AllExceptionsFilter } from "./common/filters";
import {
  LoggingInterceptor,
  TransformInterceptor,
} from "./common/interceptors";
import { AppLogger } from "./common/logger";
import { ConfigModule } from "./config/config.module";
import { TypedConfigService } from "./config/config.service";
import { DocsModule } from "./docs/docs.module";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { SprintsModule } from "./sprints/sprints.module";
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

    // Global Modules
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
    ArtifactsModule,
    DocsModule,
    CiModule,
  ],
  providers: [
    AppLogger,
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
  exports: [AppLogger],
})
export class AppModule {}
