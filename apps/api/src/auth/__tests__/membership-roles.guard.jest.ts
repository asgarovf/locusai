import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports

import { MembershipRole } from "@locusai/shared";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { OrganizationsService } from "@/organizations/organizations.service";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { MembershipRolesGuard } from "../guards/membership-roles.guard";

describe("MembershipRolesGuard", () => {
  let guard: MembershipRolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let orgService: jest.Mocked<OrganizationsService>;
  let workspaceService: jest.Mocked<WorkspacesService>;

  const createMockContext = (
    user: any,
    params: Record<string, string> = {}
  ): ExecutionContext => {
    const request = { user, params };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn() as any,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => "http" as any,
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipRolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: OrganizationsService,
          useValue: {
            getMembers: jest.fn(),
          },
        },
        {
          provide: WorkspacesService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<MembershipRolesGuard>(MembershipRolesGuard);
    reflector = module.get(Reflector);
    orgService = module.get(OrganizationsService);
    workspaceService = module.get(WorkspacesService);
  });

  describe("no required roles", () => {
    it("should allow access when no roles are required", async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should allow access when roles array is empty", async () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe("no user", () => {
    it("should deny access when no user is present", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const context = createMockContext(undefined, { orgId: "org-1" });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe("admin bypass", () => {
    it("should allow ADMIN users to bypass membership checks", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.OWNER]);
      const adminUser = {
        authType: "jwt",
        id: "admin-1",
        role: "ADMIN",
      };
      const context = createMockContext(adminUser, { orgId: "org-1" });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should not call orgService for admin
      expect(orgService.getMembers).not.toHaveBeenCalled();
    });
  });

  describe("organization context", () => {
    it("should throw ForbiddenException when no org or workspace context", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const user = { authType: "jwt", id: "user-1", role: "USER" };
      const context = createMockContext(user, {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("should resolve orgId from workspace when only workspaceId provided", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const user = { authType: "jwt", id: "user-1", role: "USER" };
      const context = createMockContext(user, { workspaceId: "ws-1" });

      workspaceService.findById.mockResolvedValue({
        id: "ws-1",
        orgId: "org-1",
      } as any);
      orgService.getMembers.mockResolvedValue([
        { userId: "user-1", role: MembershipRole.MEMBER } as any,
      ]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(workspaceService.findById).toHaveBeenCalledWith("ws-1");
    });

    it("should throw when workspace not found", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const user = { authType: "jwt", id: "user-1", role: "USER" };
      const context = createMockContext(user, { workspaceId: "ws-unknown" });

      workspaceService.findById.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        "Workspace not found"
      );
    });
  });

  describe("API key authentication", () => {
    it("should grant access when API key belongs to the organization", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const apiKeyUser = {
        authType: "api_key",
        apiKeyId: "key-1",
        apiKeyName: "Test",
        orgId: "org-1",
      };
      const context = createMockContext(apiKeyUser, { orgId: "org-1" });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should deny when API key does not belong to the organization", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const apiKeyUser = {
        authType: "api_key",
        apiKeyId: "key-1",
        apiKeyName: "Test",
        orgId: "org-other",
      };
      const context = createMockContext(apiKeyUser, { orgId: "org-1" });

      await expect(guard.canActivate(context)).rejects.toThrow(
        "API key does not have access to this organization"
      );
    });
  });

  describe("JWT membership checks", () => {
    it("should allow access when user has required role", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const user = { authType: "jwt", id: "user-1", role: "USER" };
      const context = createMockContext(user, { orgId: "org-1" });

      orgService.getMembers.mockResolvedValue([
        { userId: "user-1", role: MembershipRole.MEMBER } as any,
      ]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should allow OWNER when MEMBER or OWNER is required", async () => {
      reflector.getAllAndOverride.mockReturnValue([
        MembershipRole.MEMBER,
        MembershipRole.OWNER,
      ]);
      const user = { authType: "jwt", id: "user-1", role: "USER" };
      const context = createMockContext(user, { orgId: "org-1" });

      orgService.getMembers.mockResolvedValue([
        { userId: "user-1", role: MembershipRole.OWNER } as any,
      ]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should deny when user is not a member of the organization", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.MEMBER]);
      const user = { authType: "jwt", id: "user-1", role: "USER" };
      const context = createMockContext(user, { orgId: "org-1" });

      orgService.getMembers.mockResolvedValue([
        { userId: "user-other", role: MembershipRole.OWNER } as any,
      ]);

      await expect(guard.canActivate(context)).rejects.toThrow(
        "Not a member of this organization"
      );
    });

    it("should deny when user has insufficient permissions", async () => {
      reflector.getAllAndOverride.mockReturnValue([MembershipRole.OWNER]);
      const user = { authType: "jwt", id: "user-1", role: "USER" };
      const context = createMockContext(user, { orgId: "org-1" });

      orgService.getMembers.mockResolvedValue([
        { userId: "user-1", role: MembershipRole.MEMBER } as any,
      ]);

      await expect(guard.canActivate(context)).rejects.toThrow(
        "Insufficient membership permissions"
      );
    });
  });
});
