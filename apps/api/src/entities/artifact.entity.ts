import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Task } from "./task.entity";

@Entity("artifacts")
export class Artifact {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "task_id" })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column({ name: "content_text", nullable: true })
  contentText: string;

  @Column({ name: "file_path", nullable: true })
  filePath: string;

  @Column({ name: "created_by" })
  createdBy: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
