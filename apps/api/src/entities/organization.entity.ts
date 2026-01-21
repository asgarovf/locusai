import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Membership } from "./membership.entity";
import { Workspace } from "./workspace.entity";

@Entity("organizations")
export class Organization {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: "avatar_url", nullable: true })
  avatarUrl: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => Membership,
    (membership) => membership.organization
  )
  memberships: Membership[];

  @OneToMany(
    () => Workspace,
    (workspace) => workspace.organization
  )
  workspaces: Workspace[];
}
