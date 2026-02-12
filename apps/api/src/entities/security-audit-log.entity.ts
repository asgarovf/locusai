import { SecurityAuditEventType } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("security_audit_logs")
@Index(["eventType", "createdAt"])
export class SecurityAuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_type", type: "varchar" })
  eventType: SecurityAuditEventType;

  @Index()
  @Column({ nullable: true })
  email: string | null;

  @Index()
  @Column({ name: "user_id", nullable: true })
  userId: string | null;

  @Column({ nullable: true })
  ip: string | null;

  @Column({ name: "user_agent", nullable: true })
  userAgent: string | null;

  @Column({ name: "request_id", nullable: true })
  requestId: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
