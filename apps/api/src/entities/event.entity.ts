import { $FixMe, EventType } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Task } from "./task.entity";
import { User } from "./user.entity";
import { Workspace } from "./workspace.entity";

@Entity("events")
@Index(["workspaceId", "createdAt"])
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Index()
  @Column({ name: "task_id", nullable: true })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Index()
  @Column({ name: "user_id", nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "varchar",
  })
  type: EventType;

  @Column({ type: "jsonb", nullable: true })
  payload: Record<string, $FixMe>;

  @Index()
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
