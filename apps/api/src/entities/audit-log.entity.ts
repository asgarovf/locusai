import { $FixMe } from "@locusai/shared";
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

@Entity("audit_logs")
@Index(["userId", "createdAt"])
@Index(["action", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "user_id", nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  @Index()
  @Column({ type: "varchar" })
  action: string;

  @Column({ type: "varchar", nullable: true })
  resource: string | null;

  @Column({ name: "resource_id", type: "varchar", nullable: true })
  resourceId: string | null;

  @Column({ name: "ip_address", type: "varchar", nullable: true })
  ipAddress: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, $FixMe> | null;

  @Index()
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
