import {
  AuthenticatedUser,
  isJwtUser,
  UserRole,
} from "@locusai/shared";
import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
} from "@nestjs/common";
import { AuditLog } from "@/common/decorators";
import { CurrentUser } from "./decorators";
import { IpBlockService } from "./ip-block.service";

@Controller("auth/ip-blocks")
export class IpBlockController {
  constructor(private readonly ipBlockService: IpBlockService) {}

  /**
   * Get all currently blocked IP addresses (admin only)
   */
  @Get()
  @AuditLog("IP_BLOCKS_LIST", "auth")
  async listBlockedIps(@CurrentUser() authUser: AuthenticatedUser) {
    this.assertAdmin(authUser);

    const blockedIps = await this.ipBlockService.getBlockedIps();
    return {
      blockedIps: blockedIps.map((ip) => ({
        id: ip.id,
        ipAddress: ip.ipAddress,
        failedAttempts: ip.failedAttempts,
        blockedAt: ip.blockedAt?.toISOString(),
        blockExpiresAt: ip.blockExpiresAt?.toISOString(),
        lastFailedAttempt: ip.lastFailedAttempt?.toISOString(),
        createdAt: ip.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get status of a specific IP address (admin only)
   */
  @Get(":ipAddress")
  @AuditLog("IP_BLOCK_STATUS", "auth")
  async getIpStatus(
    @Param("ipAddress") ipAddress: string,
    @CurrentUser() authUser: AuthenticatedUser
  ) {
    this.assertAdmin(authUser);

    const status = await this.ipBlockService.getIpStatus(ipAddress);
    return {
      ipAddress,
      ...status,
      blockedAt: status.blockedAt?.toISOString() ?? null,
      blockExpiresAt: status.blockExpiresAt?.toISOString() ?? null,
    };
  }

  /**
   * Manually unblock an IP address (admin only)
   */
  @Delete(":ipAddress")
  @AuditLog("IP_UNBLOCK", "auth")
  async unblockIp(
    @Param("ipAddress") ipAddress: string,
    @CurrentUser() authUser: AuthenticatedUser
  ) {
    this.assertAdmin(authUser);

    await this.ipBlockService.unblockIp(ipAddress);
    return { success: true, message: `IP address ${ipAddress} has been unblocked` };
  }

  private assertAdmin(authUser: AuthenticatedUser): void {
    if (!isJwtUser(authUser) || authUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException("This endpoint requires admin access");
    }
  }
}
