import { MembershipRole } from "@locusai/shared";
import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { MEMBERSHIP_ROLES_KEY } from "../constants";
import { MembershipRolesGuard } from "../guards/membership-roles.guard";

export const MembershipRoles = (...roles: MembershipRole[]) =>
  applyDecorators(
    SetMetadata(MEMBERSHIP_ROLES_KEY, roles),
    UseGuards(MembershipRolesGuard)
  );

export const Member = () =>
  MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  );

export const MemberAdmin = () =>
  MembershipRoles(MembershipRole.OWNER, MembershipRole.ADMIN);

export const MemberOwner = () => MembershipRoles(MembershipRole.OWNER);

export const AnyMember = () =>
  MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
    MembershipRole.VIEWER
  );
