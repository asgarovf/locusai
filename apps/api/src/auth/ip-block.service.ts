import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { IpBlock } from "@/entities/ip-block.entity";

const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_DURATION_HOURS = 24;

export interface IpBlockStatus {
  isBlocked: boolean;
  failedAttempts: number;
  blockedAt: Date | null;
  blockExpiresAt: Date | null;
  remainingAttempts: number;
}

@Injectable()
export class IpBlockService {
  private readonly logger = new Logger(IpBlockService.name);

  constructor(
    @InjectRepository(IpBlock)
    private readonly ipBlockRepository: Repository<IpBlock>
  ) {}

  /**
   * Check if an IP address is currently blocked
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const record = await this.ipBlockRepository.findOne({
      where: { ipAddress },
    });

    if (!record) {
      return false;
    }

    // Check if manually unblocked
    if (record.manuallyUnblocked) {
      return false;
    }

    // Check if block has expired
    if (record.blockExpiresAt && record.blockExpiresAt <= new Date()) {
      return false;
    }

    // IP is blocked if blockedAt is set and block hasn't expired
    return record.blockedAt !== null;
  }

  /**
   * Get the status of an IP address
   */
  async getIpStatus(ipAddress: string): Promise<IpBlockStatus> {
    const record = await this.ipBlockRepository.findOne({
      where: { ipAddress },
    });

    if (!record) {
      return {
        isBlocked: false,
        failedAttempts: 0,
        blockedAt: null,
        blockExpiresAt: null,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
      };
    }

    const isBlocked = await this.isIpBlocked(ipAddress);

    return {
      isBlocked,
      failedAttempts: record.failedAttempts,
      blockedAt: record.blockedAt,
      blockExpiresAt: record.blockExpiresAt,
      remainingAttempts: isBlocked
        ? 0
        : Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts),
    };
  }

  /**
   * Record a failed login attempt for an IP address
   * Blocks the IP if it exceeds the maximum allowed attempts
   */
  async recordFailedAttempt(ipAddress: string): Promise<IpBlockStatus> {
    let record = await this.ipBlockRepository.findOne({
      where: { ipAddress },
    });

    if (!record) {
      record = this.ipBlockRepository.create({
        ipAddress,
        failedAttempts: 0,
      });
    }

    // Reset if previously blocked but now expired or manually unblocked
    if (record.manuallyUnblocked) {
      record.manuallyUnblocked = false;
      record.blockedAt = null;
      record.blockExpiresAt = null;
      record.failedAttempts = 0;
    } else if (record.blockExpiresAt && record.blockExpiresAt <= new Date()) {
      record.blockedAt = null;
      record.blockExpiresAt = null;
      record.failedAttempts = 0;
    }

    record.failedAttempts += 1;
    record.lastFailedAttempt = new Date();

    // Block if exceeded threshold
    if (record.failedAttempts >= MAX_FAILED_ATTEMPTS && !record.blockedAt) {
      record.blockedAt = new Date();
      record.blockExpiresAt = new Date(
        Date.now() + BLOCK_DURATION_HOURS * 60 * 60 * 1000
      );
      this.logger.warn(
        `IP ${ipAddress} has been blocked after ${record.failedAttempts} failed attempts`
      );
    }

    await this.ipBlockRepository.save(record);

    return this.getIpStatus(ipAddress);
  }

  /**
   * Reset failed attempts for an IP address (called on successful login)
   */
  async resetFailedAttempts(ipAddress: string): Promise<void> {
    const record = await this.ipBlockRepository.findOne({
      where: { ipAddress },
    });

    if (record) {
      record.failedAttempts = 0;
      record.blockedAt = null;
      record.blockExpiresAt = null;
      record.manuallyUnblocked = false;
      await this.ipBlockRepository.save(record);
    }
  }

  /**
   * Manually unblock an IP address (admin action)
   */
  async unblockIp(ipAddress: string): Promise<void> {
    const record = await this.ipBlockRepository.findOne({
      where: { ipAddress },
    });

    if (!record) {
      throw new NotFoundException(`IP address ${ipAddress} not found`);
    }

    record.manuallyUnblocked = true;
    record.failedAttempts = 0;
    record.blockedAt = null;
    record.blockExpiresAt = null;
    await this.ipBlockRepository.save(record);

    this.logger.log(`IP ${ipAddress} has been manually unblocked`);
  }

  /**
   * Get all currently blocked IPs
   */
  async getBlockedIps(): Promise<IpBlock[]> {
    const now = new Date();
    return this.ipBlockRepository
      .createQueryBuilder("ip_block")
      .where("ip_block.blocked_at IS NOT NULL")
      .andWhere("ip_block.manually_unblocked = :unblocked", { unblocked: false })
      .andWhere("ip_block.block_expires_at > :now", { now })
      .orderBy("ip_block.blocked_at", "DESC")
      .getMany();
  }

  /**
   * Check if IP is blocked and throw exception if so
   */
  async assertNotBlocked(ipAddress: string): Promise<void> {
    const isBlocked = await this.isIpBlocked(ipAddress);
    if (isBlocked) {
      const status = await this.getIpStatus(ipAddress);
      throw new ForbiddenException({
        message: "Your IP address has been temporarily blocked due to too many failed login attempts",
        code: "IP_BLOCKED",
        blockExpiresAt: status.blockExpiresAt?.toISOString(),
      });
    }
  }

  /**
   * Clean up expired IP block records (call periodically via cron)
   */
  async cleanupExpiredBlocks(): Promise<number> {
    const result = await this.ipBlockRepository.delete({
      blockExpiresAt: LessThan(new Date()),
      manuallyUnblocked: false,
    });

    const deleted = result.affected || 0;
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired IP block records`);
    }

    return deleted;
  }
}
