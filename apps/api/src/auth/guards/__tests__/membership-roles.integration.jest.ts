import "reflect-metadata";
import "../../../test-setup"; // Shared entity mocks - must be before other imports
import { Controller, Get, INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { MembershipRole } from "@locusai/shared";
import { MembershipRoles } from "../../decorators/membership-roles.decorator";
import { MembershipRolesGuard } from "../membership-roles.guard";
import { OrganizationsService } from "@/organizations/organizations.service";
import { WorkspacesService } from "@/workspaces/workspaces.service";

@Controller("access")
class MembershipRolesTestController {
  @Get("org/:orgId")
  @MembershipRoles(MembershipRole.ADMIN)
  orgAccess() {
    return { ok: true };
  }

  @Get("workspace/:workspaceId")
  @MembershipRoles(MembershipRole.ADMIN)
  workspaceAccess() {
    return { ok: true };
  }
}

describe("MembershipRolesGuard Integration", () => {
  let app: INestApplication;
  let orgService: { getMembers: jest.Mock };
  let workspaceService: { findById: jest.Mock };

  beforeAll(async () => {
    orgService = {
      getMembers: jest.fn(),
    };
    workspaceService = {
      findById: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MembershipRolesTestController],
      providers: [
        Reflector,
        MembershipRolesGuard,
        {
          provide: OrganizationsService,
          useValue: orgService,
        },
        {
          provide: WorkspacesService,
          useValue: workspaceService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use((req, _res, next) => {
      const userHeader = req.headers["x-test-user"];
      if (userHeader === "api_key") {
        req.user = {
          authType: "api_key",
          apiKeyId: "key-1",
          apiKeyName: "Test Key",
          orgId: req.headers["x-test-org"],
        };
      }
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    orgService.getMembers.mockReset();
    workspaceService.findById.mockReset();
  });

  it("allows API keys for matching organization context", async () => {
    await request(app.getHttpServer())
      .get("/access/org/org-1")
      .set("x-test-user", "api_key")
      .set("x-test-org", "org-1")
      .expect(200);

    expect(orgService.getMembers).not.toHaveBeenCalled();
  });

  it("rejects API keys for mismatched organization", async () => {
    await request(app.getHttpServer())
      .get("/access/org/org-2")
      .set("x-test-user", "api_key")
      .set("x-test-org", "org-1")
      .expect(403);
  });

  it("allows API keys when workspace resolves to matching org", async () => {
    workspaceService.findById.mockResolvedValue({ orgId: "org-1" });

    await request(app.getHttpServer())
      .get("/access/workspace/ws-1")
      .set("x-test-user", "api_key")
      .set("x-test-org", "org-1")
      .expect(200);

    expect(workspaceService.findById).toHaveBeenCalledWith("ws-1");
  });

  it("rejects API keys when workspace cannot be resolved", async () => {
    workspaceService.findById.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get("/access/workspace/ws-missing")
      .set("x-test-user", "api_key")
      .set("x-test-org", "org-1")
      .expect(403);
  });
});
