import { SprintStatus } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Task } from "./task.entity";
import { Workspace } from "./workspace.entity";

@Entity("sprints")
@Index(["workspaceId", "status"])
export class Sprint {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @OneToMany(
    () => Task,
    (task) => task.sprint
  )
  tasks: Task[];

  @Column()
  name: string;

  @Index()
  @Column({
    type: "varchar",
    default: SprintStatus.PLANNED,
  })
  status: SprintStatus;

  @Column({ name: "start_date", type: "timestamptz", nullable: true })
  startDate: Date | null;

  @Column({ name: "end_date", type: "timestamptz", nullable: true })
  endDate: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
