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
import { Workspace } from "./workspace.entity";

@Entity("agent_registrations")
@Index(["workspaceId", "agentId"], { unique: true })
export class AgentRegistration {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column({ name: "agent_id" })
  agentId: string;

  @Column({
    name: "current_task_id",
    type: "uuid",
    nullable: true,
  })
  currentTaskId: string | null;

  @Column({
    type: "varchar",
    default: "IDLE",
  })
  status: string;

  @Column({
    name: "last_heartbeat",
    type: "timestamptz",
  })
  lastHeartbeat: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
