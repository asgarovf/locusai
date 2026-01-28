import "reflect-metadata";
import "../../test-setup";
import { MembershipRole } from "@locusai/shared";
import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKey, Membership, Organization, User } from "@/entities";
import { OrganizationsService } from "../organizations.service";

describe("OrganizationsService", () => {
  let service: OrganizationsService;
  let orgRepo: jest.Mocked<Repository<Organization>>;
  let membershipRepo: jest.Mocked<Repository<Membership>>;
  let apiKeyRepo: jest.Mocked<Repository<ApiKey>>;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Membership),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ApiKey),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    orgRepo = module.get(getRepositoryToken(Organization));
    membershipRepo = module.get(getRepositoryToken(Membership));
    apiKeyRepo = module.get(getRepositoryToken(ApiKey));
    userRepo = module.get(getRepositoryToken(User));
  });

  describe("removeMember", () => {
    it("should remove a member", async () => {
      const orgId = "org-1";
      const userId = "user-1";
      membershipRepo.findOne.mockResolvedValue({
        id: "mem-1",
        role: MembershipRole.MEMBER,
      } as any);

      await service.removeMember(orgId, userId);

      expect(userRepo.delete).toHaveBeenCalledWith(userId);
    });

    it("should throw ConflictException when removing the last owner", async () => {
      const orgId = "org-1";
      const userId = "user-1";
      membershipRepo.findOne.mockResolvedValue({
        id: "mem-1",
        role: MembershipRole.OWNER,
      } as any);
      membershipRepo.count.mockResolvedValue(1);

      await expect(service.removeMember(orgId, userId)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe("createApiKey", () => {
    it("should create an API key and return the raw key", async () => {
      const orgId = "org-1";
      const name = "Test Key";
      orgRepo.findOne.mockResolvedValue({ id: orgId } as any);
      apiKeyRepo.create.mockReturnValue({ id: "key-1", name } as any);
      apiKeyRepo.save.mockResolvedValue({ id: "key-1", name } as any);

      const result = await service.createApiKey(orgId, name);

      expect(result.apiKey.id).toBe("key-1");
      expect(result.key).toMatch(/^lk_/);
      expect(apiKeyRepo.save).toHaveBeenCalled();
    });
  });
});
