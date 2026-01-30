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
import { Organization } from "./organization.entity";
import { Workspace } from "./workspace.entity";

@Entity("api_keys")
export class ApiKey {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "organization_id", nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "organization_id" })
  organization: Organization | null;

  @Index()
  @Column({ name: "workspace_id", nullable: true })
  workspaceId: string | null;

  @ManyToOne("Workspace", { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column()
  name: string;

  @Column({ name: "key_hash", unique: true })
  keyHash: string;

  @Column({ name: "key_prefix" })
  keyPrefix: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: "last_used_at", type: "timestamptz", nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
