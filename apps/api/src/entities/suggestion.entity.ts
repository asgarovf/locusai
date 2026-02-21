import { $FixMe, SuggestionStatus, SuggestionType } from "@locusai/shared";
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
import { JobRun } from "./job-run.entity";
import { Workspace } from "./workspace.entity";

@Entity("suggestions")
@Index(["workspaceId", "status"])
@Index(["workspaceId", "type"])
export class Suggestion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  type: SuggestionType;

  @Column({
    type: "varchar",
    default: SuggestionStatus.NEW,
  })
  status: SuggestionStatus;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ name: "job_run_id", nullable: true })
  jobRunId: string;

  @ManyToOne(() => JobRun, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "job_run_id" })
  jobRun: JobRun;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, $FixMe>;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
