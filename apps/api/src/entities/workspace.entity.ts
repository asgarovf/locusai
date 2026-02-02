import { AgentState, ProjectManifest } from "@locusai/ai-sdk";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiKey } from "./api-key.entity";
import { Organization } from "./organization.entity";

@Entity("workspaces")
export class Workspace {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "org_id" })
  orgId: string;

  @ManyToOne(
    () => Organization,
    (org) => org.workspaces,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "org_id" })
  organization: Organization;

  @Column()
  name: string;

  @Column({ name: "default_checklist", type: "jsonb", nullable: true })
  defaultChecklist: Array<{ id: string; text: string; done: boolean }>;

  @Column({ name: "project_manifest", type: "jsonb", nullable: true })
  projectManifest: Partial<ProjectManifest>;

  @Column({ name: "agent_state", type: "jsonb", nullable: true })
  agentState: Partial<AgentState>;

  @Column({ name: "interview_started_at", type: "timestamptz", nullable: true })
  interviewStartedAt: Date | null;

  @Column({
    name: "interview_completed_at",
    type: "timestamptz",
    nullable: true,
  })
  interviewCompletedAt: Date | null;

  @Column({
    name: "interview_last_activity_at",
    type: "timestamptz",
    nullable: true,
  })
  interviewLastActivityAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => ApiKey,
    (key) => key.workspace
  )
  apiKeys: ApiKey[];
}
