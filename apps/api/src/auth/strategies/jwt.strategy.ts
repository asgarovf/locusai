import { JwtAuthUser } from "@locusai/shared";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TypedConfigService } from "../../config/config.service";
import { UsersService } from "../../users/users.service";
import { JwtPayload } from "../interfaces/auth-request.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: TypedConfigService,
    private usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtAuthUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    // Return properly typed JwtAuthUser
    return {
      authType: "jwt",
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: payload.orgId ?? null,
      workspaceId: null,
    };
  }
}
