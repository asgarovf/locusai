import { DocType } from "@locusai/shared";
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
import { DocGroup } from "./doc-group.entity";
import { Workspace } from "./workspace.entity";

@Entity("docs")
export class Doc {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Index()
  @Column({ name: "group_id", nullable: true })
  groupId: string | null;

  @ManyToOne(
    () => DocGroup,
    (group) => group.docs,
    { nullable: true, onDelete: "SET NULL" }
  )
  @JoinColumn({ name: "group_id" })
  group: DocGroup | null;

  @Column()
  title: string;

  @Column({ type: "varchar", default: DocType.GENERAL })
  type: DocType;

  @Column({ type: "text", nullable: true })
  content: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
