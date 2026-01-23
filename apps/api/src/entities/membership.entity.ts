import { MembershipRole } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";

@Entity("memberships")
@Index(["userId", "orgId"], { unique: true })
export class Membership {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Index()
  @Column({ name: "org_id" })
  orgId: string;

  @ManyToOne(
    () => Organization,
    (org) => org.memberships,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "org_id" })
  organization: Organization;

  @Column({
    type: "varchar",
    default: MembershipRole.MEMBER,
  })
  role: MembershipRole;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
