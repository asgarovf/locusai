import { z } from "zod";
import { BaseEntitySchema } from "../common";
import { UserRole } from "../enums";

export const UserSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.nativeEnum(UserRole),
  orgId: z.string().uuid().optional().nullable(),
  workspaceId: z.string().uuid().optional().nullable(),
  companyName: z.string().optional(),
  userRole: z.string().optional(),
  teamSize: z.string().optional(),
  onboardingCompleted: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = UserSchema.partial().omit({
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
