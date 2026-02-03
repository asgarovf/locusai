import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "token_hash", unique: true })
  tokenHash: string;

  @Index()
  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @Column({ name: "user_agent", nullable: true })
  userAgent: string | null;

  @Column({ name: "ip_address", nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
