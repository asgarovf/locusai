import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("otp_verifications")
export class OtpVerification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({ name: "expires_at" })
  expiresAt: Date;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
