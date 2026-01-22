import { AssigneeRole, TaskPriority, TaskStatus } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Doc } from "./doc.entity";
import { Sprint } from "./sprint.entity";
import { Workspace } from "./workspace.entity";

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: "varchar",
    default: TaskStatus.BACKLOG,
  })
  status: TaskStatus;

  @Column({
    type: "varchar",
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: "jsonb", default: [] })
  labels: string[];

  @Column({
    name: "assignee_role",
    type: "varchar",
    nullable: true,
  })
  assigneeRole: AssigneeRole;

  @Column({ name: "parent_id", nullable: true })
  parentId: string;

  @Column({ name: "sprint_id", nullable: true })
  sprintId: string | null;

  @ManyToOne(
    () => Sprint,
    (sprint) => sprint.tasks,
    {
      nullable: true,
      onDelete: "SET NULL",
    }
  )
  @JoinColumn({ name: "sprint_id" })
  sprint: Sprint | null;

  @ManyToMany(() => Doc)
  @JoinTable({
    name: "task_docs",
    joinColumn: { name: "task_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "doc_id", referencedColumnName: "id" },
  })
  docs: Doc[];

  @Column({ name: "locked_by", nullable: true })
  lockedBy: string;

  @Column({ name: "lock_expires_at", type: "timestamp", nullable: true })
  lockExpiresAt: Date;

  @Column({ name: "acceptance_checklist", type: "jsonb", default: [] })
  acceptanceChecklist: Array<{ id: string; text: string; done: boolean }>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
