import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IpBlockService } from "@/auth/ip-block.service";
import { SKIP_IP_BLOCK_KEY } from "@/common/decorators/skip-ip-block.decorator";

@Injectable()
export class IpBlockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ipBlockService: IpBlockService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if IP block check should be skipped for this route
    const skipIpBlock = this.reflector.getAllAndOverride<boolean>(
      SKIP_IP_BLOCK_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (skipIpBlock) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ipAddress = this.extractIpAddress(request);

    // If we can't determine the IP, allow the request to continue
    if (!ipAddress) {
      return true;
    }

    // Check if IP is blocked and throw ForbiddenException if so
    await this.ipBlockService.assertNotBlocked(ipAddress);

    return true;
  }

  private extractIpAddress(request: Request): string | undefined {
    // Check X-Forwarded-For header first (for proxied requests)
    const forwardedFor = request.headers["x-forwarded-for"];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(",")[0];
      return ips?.trim();
    }

    // Fall back to request.ip or socket remote address
    return request.ip || request.socket?.remoteAddress;
  }
}
