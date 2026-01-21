import { MembershipRole } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";

@Entity("invitations")
export class Invitation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "org_id" })
  orgId: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "org_id" })
  organization: Organization;

  @Column()
  email: string;

  @Column({
    type: "varchar",
    default: MembershipRole.MEMBER,
  })
  role: MembershipRole;

  @Column({ unique: true })
  token: string;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ name: "accepted_at", type: "timestamp", nullable: true })
  acceptedAt: Date;

  @Column({ name: "invited_by_id" })
  invitedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "invited_by_id" })
  invitedBy: User;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
