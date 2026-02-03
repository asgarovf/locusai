import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypedConfigService } from "@/config/config.service";
import {
  ApiKey,
  IpBlock,
  Membership,
  Organization,
  OtpVerification,
  RefreshToken,
  User,
  Workspace,
} from "@/entities";
import { UsersModule } from "@/users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CookieService } from "./cookie.service";
import { CsrfService } from "./csrf.service";
import { IpBlockController } from "./ip-block.controller";
import { IpBlockService } from "./ip-block.service";
import { OAuthCodeService } from "./oauth-code.service";
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
      RefreshToken,
      IpBlock,
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
  providers: [AuthService, OtpService, CookieService, CsrfService, OAuthCodeService, IpBlockService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController, IpBlockController],
  exports: [AuthService, CookieService, CsrfService, IpBlockService],
})
export class AuthModule {}
