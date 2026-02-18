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

@Entity("aws_credentials")
export class AwsCredential {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column({ name: "access_key_id_encrypted", type: "text" })
  accessKeyIdEncrypted: string;

  @Column({ name: "secret_access_key_encrypted", type: "text" })
  secretAccessKeyEncrypted: string;

  @Column({ type: "varchar", default: "us-east-1" })
  region: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
