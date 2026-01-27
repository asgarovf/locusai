import { AgentState } from "@locusai/ai-sdk";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("ai_sessions")
@Index(["workspaceId", "externalSessionId"], { unique: true })
export class AiSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "workspace_id" })
  workspaceId: string;

  @Column({ name: "user_id", nullable: true })
  userId: string;

  @Column({ name: "external_session_id" })
  externalSessionId: string;

  @Column({ type: "jsonb", default: {} })
  state: Partial<AgentState>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
