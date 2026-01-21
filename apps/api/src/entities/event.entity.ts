import { $FixMe, EventType } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Task } from "./task.entity";
import { User } from "./user.entity";
import { Workspace } from "./workspace.entity";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column({ name: "task_id", nullable: true })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Column({ name: "user_id", nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "varchar",
  })
  type: EventType;

  @Column({ type: "jsonb", nullable: true })
  payload: Record<string, $FixMe>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
