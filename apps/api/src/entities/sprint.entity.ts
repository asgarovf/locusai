import { SprintStatus } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Task } from "./task.entity";
import { Workspace } from "./workspace.entity";

@Entity("sprints")
export class Sprint {
  @PrimaryGeneratedColumn("uuid")
  id: string;

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

  @Column({
    type: "varchar",
    default: SprintStatus.PLANNED,
  })
  status: SprintStatus;

  @Column({ name: "start_date", type: "timestamp", nullable: true })
  startDate: Date;

  @Column({ name: "end_date", type: "timestamp", nullable: true })
  endDate: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
