import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("ip_blocks")
export class IpBlock {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ name: "ip_address" })
  ipAddress: string;

  @Column({ name: "failed_attempts", default: 0 })
  failedAttempts: number;

  @Column({ name: "blocked_at", type: "timestamptz", nullable: true })
  blockedAt: Date | null;

  @Column({ name: "block_expires_at", type: "timestamptz", nullable: true })
  blockExpiresAt: Date | null;

  @Column({ name: "manually_unblocked", default: false })
  manuallyUnblocked: boolean;

  @Column({ name: "last_failed_attempt", type: "timestamptz", nullable: true })
  lastFailedAttempt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
