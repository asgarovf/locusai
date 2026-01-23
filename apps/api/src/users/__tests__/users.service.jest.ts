import "reflect-metadata";
import "../../test-setup";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@/entities/user.entity";
import { UsersService } from "../users.service";

describe("UsersService", () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it("should create a user", async () => {
    const userData = { email: "test@example.com", name: "Test User" };
    repository.create.mockReturnValue(userData as any);
    repository.save.mockResolvedValue(userData as any);

    const result = await service.create(userData);
    expect(result).toEqual(userData);
    expect(repository.create).toHaveBeenCalledWith(userData);
  });

  it("should find a user by email", async () => {
    const user = { id: "1", email: "test@example.com" };
    repository.findOne.mockResolvedValue(user as any);

    const result = await service.findByEmail("test@example.com");
    expect(result).toEqual(user);
  });

  it("should throw NotFoundException if user not found by id", async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById("1")).rejects.toThrow(NotFoundException);
  });
});
