import {
  AuthenticatedUser,
  isApiKeyUser,
  isJwtUser,
  MembershipRole,
} from "@locusai/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { OrganizationsService } from "@/organizations/organizations.service";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { MEMBERSHIP_ROLES_KEY } from "../decorators/membership-roles.decorator";

@Injectable()
export class MembershipRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private orgService: OrganizationsService,
    private workspaceService: WorkspacesService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(
      MEMBERSHIP_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      return false;
    }

    // System ADMIN bypasses all membership checks (JWT users only)
    if (isJwtUser(user) && user.role === "ADMIN") {
      return true;
    }

    // STRICT CONVENTION: Organization/workspace context MUST come from URL params only
    // Never from body or query string
    const orgId = request.params?.orgId;
    const workspaceId = request.params?.workspaceId;

    if (!orgId && !workspaceId) {
      throw new ForbiddenException(
        "Organization or workspace context required in URL path"
      );
    }

    // If only workspaceId provided, resolve to orgId
    let resolvedOrgId = orgId;
    if (!resolvedOrgId && workspaceId) {
      const workspace = await this.workspaceService.findById(workspaceId);
      if (!workspace) {
        throw new ForbiddenException("Workspace not found");
      }
      resolvedOrgId = workspace.orgId;
    }

    if (!resolvedOrgId) {
      throw new ForbiddenException("Organization context required");
    }

    // API Key authentication - check if key belongs to this organization
    if (isApiKeyUser(user)) {
      if (user.orgId === resolvedOrgId) {
        // API key belongs to this org, grant full access
        return true;
      }
      throw new ForbiddenException(
        "API key does not have access to this organization"
      );
    }

    // JWT user authentication - check membership
    const members = await this.orgService.getMembers(resolvedOrgId);
    const membership = members.find((m) => m.userId === user.id);

    if (!membership) {
      throw new ForbiddenException("Not a member of this organization");
    }

    const hasRole = requiredRoles.includes(membership.role);
    if (!hasRole) {
      throw new ForbiddenException("Insufficient membership permissions");
    }

    return true;
  }
}
