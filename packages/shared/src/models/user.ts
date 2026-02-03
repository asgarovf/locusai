import { z } from "zod";
import { BaseEntitySchema } from "../common";
import { UserRole } from "../enums";

export const UserSchema = BaseEntitySchema.extend({
  email: z.string().email().max(320),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().max(2048).url().nullable().optional(),
  role: z.enum(UserRole),
  orgId: z.uuid().optional().nullable(),
  workspaceId: z.uuid().optional().nullable(),
  companyName: z.string().max(100).optional(),
  userRole: z.string().max(50).optional(),
  teamSize: z.string().max(20).optional(),
  onboardingCompleted: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(100),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = UserSchema.partial().omit({
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
