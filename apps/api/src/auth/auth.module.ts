import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailService } from "@/common/services/email.service";
import { TypedConfigService } from "@/config/config.service";
import {
  Membership,
  Organization,
  OtpVerification,
  User,
  Workspace,
} from "@/entities";
import { UsersModule } from "@/users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { JwtStrategy } from "./strategies";

@Global()
@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([
      OtpVerification,
      User,
      Organization,
      Workspace,
      Membership,
    ]),
    JwtModule.registerAsync({
      inject: [TypedConfigService],
      useFactory: async (configService: TypedConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN"),
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    OtpService,
    EmailService,
    JwtStrategy,
    // Note: Global auth guard (JwtOrApiKeyGuard) is registered in AppModule
    // This allows both JWT and API key authentication
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
