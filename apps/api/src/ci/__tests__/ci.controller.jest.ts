import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports
import { JwtAuthUser, UserRole } from "@locusai/shared";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "@/auth/auth.service";
import { OrganizationsService } from "@/organizations/organizations.service";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { CiController } from "../ci.controller";
import { CiService } from "../ci.service";

describe("CiController", () => {
  let controller: CiController;
  let service: jest.Mocked<CiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CiController],
      providers: [
        {
          provide: CiService,
          useValue: {
            reportResult: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
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

    controller = module.get<CiController>(CiController);
    service = module.get(CiService);
  });

  it("should call ciService.reportResult", async () => {
    const workspaceId = "ws-1";
    const data = {
      preset: "test",
      ok: true,
      summary: "Success",
      commands: [],
    };

    const user: JwtAuthUser = {
      authType: "jwt",
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: UserRole.USER,
    };

    service.reportResult.mockResolvedValue({ success: true });

    const result = await controller.report(user, workspaceId, data);

    expect(result).toEqual({ success: true });
    expect(service.reportResult).toHaveBeenCalledWith(
      { ...data, workspaceId },
      user
    );
  });
});
