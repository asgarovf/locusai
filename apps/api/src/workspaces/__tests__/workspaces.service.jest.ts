import "reflect-metadata";
import "../../test-setup";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Membership } from "@/entities/membership.entity";
import { Organization } from "@/entities/organization.entity";
import { Task } from "@/entities/task.entity";
import { Workspace } from "@/entities/workspace.entity";
import { EventsService } from "@/events/events.service";
import { WorkspacesService } from "../workspaces.service";

describe("WorkspacesService", () => {
  let service: WorkspacesService;
  let workspaceRepo: jest.Mocked<Repository<Workspace>>;
  let orgRepo: jest.Mocked<Repository<Organization>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: getRepositoryToken(Workspace),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Membership),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: { getWorkspaceActivity: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    workspaceRepo = module.get(getRepositoryToken(Workspace));
    orgRepo = module.get(getRepositoryToken(Organization));
  });

  it("should find a workspace by id", async () => {
    const workspace = { id: "ws-1", name: "Test Workspace" };
    workspaceRepo.findOne.mockResolvedValue(workspace as any);

    const result = await service.findById("ws-1");
    expect(result).toEqual(workspace);
  });

  it("should throw NotFoundException if workspace not found", async () => {
    workspaceRepo.findOne.mockResolvedValue(null);
    await expect(service.findById("ws-1")).rejects.toThrow(NotFoundException);
  });

  it("should create a workspace", async () => {
    const orgId = "org-1";
    const name = "New Workspace";
    orgRepo.findOne.mockResolvedValue({ id: orgId } as any);
    workspaceRepo.create.mockReturnValue({ id: "ws-1", orgId, name } as any);
    workspaceRepo.save.mockResolvedValue({ id: "ws-1", orgId, name } as any);

    const result = await service.create(orgId, name);
    expect(result.name).toBe(name);
    expect(workspaceRepo.save).toHaveBeenCalled();
  });
});
