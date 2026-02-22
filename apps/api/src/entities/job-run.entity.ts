import { $FixMe, JobStatus, JobType } from "@locusai/shared";
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

@Entity("job_runs")
@Index(["workspaceId", "status"])
@Index(["workspaceId", "jobType"])
export class JobRun {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "job_type", type: "varchar" })
  jobType: JobType;

  @Column({
    type: "varchar",
    default: JobStatus.IDLE,
  })
  status: JobStatus;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column({ type: "jsonb", nullable: true })
  result: Record<string, $FixMe>;

  @Column({ type: "text", nullable: true })
  error: string;

  @Column({ name: "started_at", type: "timestamptz" })
  startedAt: Date;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
