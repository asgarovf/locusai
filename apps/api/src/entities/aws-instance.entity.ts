import { InstanceStatus } from "@locusai/shared";
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
import { AwsCredential } from "./aws-credential.entity";
import { Workspace } from "./workspace.entity";

@Entity("aws_instances")
export class AwsInstance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "workspace_id" })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace: Workspace;

  @Column({ name: "aws_credential_id" })
  awsCredentialId: string;

  @ManyToOne(() => AwsCredential, { onDelete: "CASCADE" })
  @JoinColumn({ name: "aws_credential_id" })
  awsCredential: AwsCredential;

  @Column({ name: "ec2_instance_id", type: "varchar", nullable: true })
  ec2InstanceId: string | null;

  @Column({
    type: "varchar",
    default: InstanceStatus.PROVISIONING,
  })
  status: InstanceStatus;

  @Column({ name: "instance_type", type: "varchar", default: "t3.small" })
  instanceType: string;

  @Column({ type: "varchar", default: "us-east-1" })
  region: string;

  @Column({ name: "public_ip", type: "varchar", nullable: true })
  publicIp: string | null;

  @Column({ name: "repo_url", type: "varchar" })
  repoUrl: string;

  @Column({ name: "github_token_encrypted", type: "text" })
  githubTokenEncrypted: string;

  @Column({ type: "jsonb", default: [] })
  integrations: unknown[];

  @Column({ name: "security_group_id", type: "varchar", nullable: true })
  securityGroupId: string | null;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ name: "launched_at", type: "timestamptz", nullable: true })
  launchedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
