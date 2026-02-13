import { AssigneeRole, TaskPriority, TaskStatus } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
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
@Index(["workspaceId", "status"])
@Index(["workspaceId", "priority"])
@Index(["workspaceId", "assignedTo"])
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Index()
  @Column({
    type: "varchar",
    default: TaskStatus.BACKLOG,
  })
  status: TaskStatus;

  @Index()
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

  @Index()
  @Column({
    name: "assigned_to",
    type: "varchar",
    nullable: true,
  })
  assignedTo: string | null;

  @Column({
    name: "assigned_at",
    type: "timestamptz",
    nullable: true,
  })
  assignedAt: Date | null;

  @Column({
    name: "due_date",
    type: "timestamptz",
    nullable: true,
  })
  dueDate: Date | null;

  @Index()
  @Column({ name: "parent_id", nullable: true })
  parentId: string;

  @Index()
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

  @Column({ name: "pr_url", type: "varchar", nullable: true })
  prUrl: string | null;

  @Column({ name: "acceptance_checklist", type: "jsonb", default: [] })
  acceptanceChecklist: Array<{ id: string; text: string; done: boolean }>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @Column({ name: "order", type: "float", default: 1000 })
  order: number;

  @Column({ name: "tier", type: "int", nullable: true })
  tier: number | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
