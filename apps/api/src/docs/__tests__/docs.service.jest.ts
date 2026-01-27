import "reflect-metadata";
import "../../test-setup";
import { DocType } from "@locusai/shared";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Doc } from "@/entities/doc.entity";
import { DocsService } from "../docs.service";

describe("DocsService", () => {
  let service: DocsService;
  let repository: jest.Mocked<Repository<Doc>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsService,
        {
          provide: getRepositoryToken(Doc),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocsService>(DocsService);
    repository = module.get(getRepositoryToken(Doc));
  });

  it("should create a doc", async () => {
    const data = {
      title: "Test Doc",
      workspaceId: "ws-1",
      type: DocType.GENERAL,
    };
    repository.create.mockReturnValue(data as any);
    repository.save.mockResolvedValue(data as any);

    const result = await service.create(data);
    expect(result).toEqual(data);
    expect(repository.create).toHaveBeenCalledWith(data);
  });

  it("should find docs by workspace", async () => {
    const docs = [{ id: "1", title: "Doc 1" }];
    repository.find.mockResolvedValue(docs as any);

    const result = await service.findByWorkspace("ws-1");
    expect(result).toEqual(docs);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws-1" },
      })
    );
  });

  it("should throw NotFoundException if doc not found", async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById("1")).rejects.toThrow(NotFoundException);
  });
});
