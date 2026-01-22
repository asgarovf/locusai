import { UserRole } from "@locusai/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: "avatar_url", nullable: true })
  avatarUrl: string;

  @Column({
    type: "varchar",
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: "company_name", nullable: true })
  companyName: string;

  @Column({ name: "team_size", nullable: true })
  teamSize: string;

  @Column({ name: "user_role", nullable: true })
  userRole: string;

  @Column({ name: "onboarding_completed", default: false })
  onboardingCompleted: boolean;

  @Column({ name: "email_verified", default: false })
  emailVerified: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
