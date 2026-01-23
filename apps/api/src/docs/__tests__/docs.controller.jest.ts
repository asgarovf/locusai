import "reflect-metadata";
import "../../test-setup";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "@/auth/auth.service";
import { OrganizationsService } from "@/organizations/organizations.service";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { DocsController } from "../docs.controller";
import { DocsService } from "../docs.service";

describe("DocsController", () => {
  let controller: DocsController;
  let service: jest.Mocked<DocsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocsController],
      providers: [
        {
          provide: DocsService,
          useValue: {
            create: jest.fn(),
            findByWorkspace: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: { validateApiKey: jest.fn() },
        },
        {
          provide: OrganizationsService,
          useValue: { getMembers: jest.fn() },
        },
        {
          provide: WorkspacesService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<DocsController>(DocsController);
    service = module.get(DocsService);
  });

  it("should list docs for a workspace", async () => {
    const docs = [{ id: "1", title: "Test Doc" }];
    service.findByWorkspace.mockResolvedValue(docs as any);

    const result = await controller.list("ws-1");
    expect(result).toEqual({ docs });
    expect(service.findByWorkspace).toHaveBeenCalledWith("ws-1");
  });

  it("should create a doc", async () => {
    const data = { title: "New Doc" };
    const createdDoc = { id: "1", ...data };
    service.create.mockResolvedValue(createdDoc as any);

    const result = await controller.create("ws-1", data as any);
    expect(result).toEqual({ doc: createdDoc });
    expect(service.create).toHaveBeenCalledWith({
      ...data,
      workspaceId: "ws-1",
    });
  });
});
