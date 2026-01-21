import { MembershipRole } from "@locusai/shared";
import { SetMetadata } from "@nestjs/common";

export const MEMBERSHIP_ROLES_KEY = "membership_roles";
export const MembershipRoles = (...roles: MembershipRole[]) =>
  SetMetadata(MEMBERSHIP_ROLES_KEY, roles);
