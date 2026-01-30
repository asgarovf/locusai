import { AgentState } from "@locusai/ai-sdk";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Workspace } from "./workspace.entity";

@Entity("ai_sessions")
@Index(["workspaceId", "externalSessionId"], { unique: true })
export class AiSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column({ name: "user_id", nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "external_session_id" })
  externalSessionId: string;

  @Column({ type: "jsonb", default: {} })
  state: Partial<AgentState>;

  @Column({ name: "is_shared", type: "boolean", default: false })
  isShared: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
