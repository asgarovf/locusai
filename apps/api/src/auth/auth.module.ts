import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypedConfigService } from "@/config/config.service";
import {
  ApiKey,
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
import { GoogleStrategy, JwtStrategy } from "./strategies";

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
      ApiKey,
    ]),
    JwtModule.registerAsync({
      inject: [TypedConfigService],
      useFactory: async (configService: TypedConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN") as "1h" | "1d" | "7d",
        },
      }),
    }),
  ],
  providers: [AuthService, OtpService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
