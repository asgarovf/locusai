import "reflect-metadata";
import "../../test-setup";

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EncryptionService } from "@/common/services/encryption.service";
import { AwsCredential } from "@/entities/aws-credential.entity";
import { AwsInstance } from "@/entities/aws-instance.entity";
import { AwsCredentialsService } from "../aws-credentials.service";
import { AwsEc2Service } from "../aws-ec2.service";

describe("AwsCredentialsService", () => {
  let service: AwsCredentialsService;
  let credentialRepo: jest.Mocked<Repository<AwsCredential>>;
  let instanceRepo: jest.Mocked<Repository<AwsInstance>>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let ec2Service: jest.Mocked<AwsEc2Service>;

  const WORKSPACE_ID = "workspace-123";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsCredentialsService,
        {
          provide: getRepositoryToken(AwsCredential),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AwsInstance),
          useValue: {
            count: jest.fn(),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn(),
            decrypt: jest.fn(),
          },
        },
        {
          provide: AwsEc2Service,
          useValue: {
            validateCredentials: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AwsCredentialsService>(AwsCredentialsService);
    credentialRepo = module.get(getRepositoryToken(AwsCredential));
    instanceRepo = module.get(getRepositoryToken(AwsInstance));
    encryptionService = module.get(EncryptionService);
    ec2Service = module.get(AwsEc2Service);
  });

  describe("saveCredentials", () => {
    const dto = {
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
    };

    it("should validate credentials before saving", async () => {
      ec2Service.validateCredentials.mockResolvedValue(true);
      encryptionService.encrypt
        .mockReturnValueOnce("encrypted-access-key")
        .mockReturnValueOnce("encrypted-secret-key");
      credentialRepo.findOne.mockResolvedValue(null);
      credentialRepo.create.mockReturnValue({
        id: "cred-1",
        workspaceId: WORKSPACE_ID,
        accessKeyIdEncrypted: "encrypted-access-key",
        secretAccessKeyEncrypted: "encrypted-secret-key",
        region: "us-east-1",
      } as any);
      credentialRepo.save.mockResolvedValue({
        id: "cred-1",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
      } as any);

      await service.saveCredentials(WORKSPACE_ID, dto);

      expect(ec2Service.validateCredentials).toHaveBeenCalledWith({
        accessKeyId: dto.accessKeyId,
        secretAccessKey: dto.secretAccessKey,
        region: dto.region,
      });
    });

    it("should throw BadRequestException when credentials are invalid", async () => {
      ec2Service.validateCredentials.mockResolvedValue(false);

      await expect(
        service.saveCredentials(WORKSPACE_ID, dto)
      ).rejects.toThrow(BadRequestException);

      expect(encryptionService.encrypt).not.toHaveBeenCalled();
      expect(credentialRepo.save).not.toHaveBeenCalled();
    });

    it("should encrypt accessKeyId and secretAccessKey before saving", async () => {
      ec2Service.validateCredentials.mockResolvedValue(true);
      encryptionService.encrypt
        .mockReturnValueOnce("encrypted-access-key")
        .mockReturnValueOnce("encrypted-secret-key");
      credentialRepo.findOne.mockResolvedValue(null);
      credentialRepo.create.mockReturnValue({} as any);
      credentialRepo.save.mockResolvedValue({
        id: "cred-1",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
      } as any);

      await service.saveCredentials(WORKSPACE_ID, dto);

      expect(encryptionService.encrypt).toHaveBeenCalledWith(dto.accessKeyId);
      expect(encryptionService.encrypt).toHaveBeenCalledWith(
        dto.secretAccessKey
      );
      expect(credentialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accessKeyIdEncrypted: "encrypted-access-key",
          secretAccessKeyEncrypted: "encrypted-secret-key",
        })
      );
    });

    it("should create a new credential when none exists", async () => {
      ec2Service.validateCredentials.mockResolvedValue(true);
      encryptionService.encrypt
        .mockReturnValueOnce("encrypted-access-key")
        .mockReturnValueOnce("encrypted-secret-key");
      credentialRepo.findOne.mockResolvedValue(null);
      credentialRepo.create.mockReturnValue({
        workspaceId: WORKSPACE_ID,
      } as any);
      credentialRepo.save.mockResolvedValue({
        id: "cred-1",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
      } as any);

      const result = await service.saveCredentials(WORKSPACE_ID, dto);

      expect(result).toEqual({
        id: "cred-1",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
      });
    });

    it("should update existing credential when one exists", async () => {
      ec2Service.validateCredentials.mockResolvedValue(true);
      encryptionService.encrypt
        .mockReturnValueOnce("new-encrypted-access-key")
        .mockReturnValueOnce("new-encrypted-secret-key");

      const existing = {
        id: "cred-1",
        workspaceId: WORKSPACE_ID,
        accessKeyIdEncrypted: "old-encrypted-access-key",
        secretAccessKeyEncrypted: "old-encrypted-secret-key",
        region: "us-west-2",
      } as any;

      credentialRepo.findOne.mockResolvedValue(existing);
      credentialRepo.save.mockResolvedValue({
        id: "cred-1",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
      } as any);

      await service.saveCredentials(WORKSPACE_ID, dto);

      expect(existing.accessKeyIdEncrypted).toBe("new-encrypted-access-key");
      expect(existing.secretAccessKeyEncrypted).toBe(
        "new-encrypted-secret-key"
      );
      expect(existing.region).toBe("us-east-1");
      expect(credentialRepo.save).toHaveBeenCalledWith(existing);
      expect(credentialRepo.create).not.toHaveBeenCalled();
    });

    it("should return only non-sensitive fields", async () => {
      ec2Service.validateCredentials.mockResolvedValue(true);
      encryptionService.encrypt.mockReturnValue("encrypted");
      credentialRepo.findOne.mockResolvedValue(null);
      credentialRepo.create.mockReturnValue({} as any);
      credentialRepo.save.mockResolvedValue({
        id: "cred-1",
        workspaceId: WORKSPACE_ID,
        accessKeyIdEncrypted: "encrypted",
        secretAccessKeyEncrypted: "encrypted",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      } as any);

      const result = await service.saveCredentials(WORKSPACE_ID, dto);

      expect(result).toEqual({
        id: "cred-1",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
      });
      expect(result).not.toHaveProperty("accessKeyIdEncrypted");
      expect(result).not.toHaveProperty("secretAccessKeyEncrypted");
    });
  });

  describe("getCredentials", () => {
    it("should return masked accessKeyId", async () => {
      const credential = {
        id: "cred-1",
        accessKeyIdEncrypted: "encrypted-key",
        region: "us-east-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      } as any;

      credentialRepo.findOne.mockResolvedValue(credential);
      encryptionService.decrypt.mockReturnValue("AKIAIOSFODNN7EXAMPLE");

      const result = await service.getCredentials(WORKSPACE_ID);

      expect(result.accessKeyId).toBe("****MPLE");
      expect(result.id).toBe("cred-1");
      expect(result.region).toBe("us-east-1");
    });

    it("should throw NotFoundException when no credentials exist", async () => {
      credentialRepo.findOne.mockResolvedValue(null);

      await expect(service.getCredentials(WORKSPACE_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should decrypt accessKeyId for masking", async () => {
      credentialRepo.findOne.mockResolvedValue({
        id: "cred-1",
        accessKeyIdEncrypted: "encrypted-key",
        region: "us-east-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      encryptionService.decrypt.mockReturnValue("AKIAIOSFODNN7EXAMPLE");

      await service.getCredentials(WORKSPACE_ID);

      expect(encryptionService.decrypt).toHaveBeenCalledWith("encrypted-key");
    });
  });

  describe("getDecryptedCredentials", () => {
    it("should return fully decrypted credentials", async () => {
      credentialRepo.findOne.mockResolvedValue({
        accessKeyIdEncrypted: "encrypted-access-key",
        secretAccessKeyEncrypted: "encrypted-secret-key",
        region: "us-east-1",
      } as any);

      encryptionService.decrypt
        .mockReturnValueOnce("AKIAIOSFODNN7EXAMPLE")
        .mockReturnValueOnce("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");

      const result = await service.getDecryptedCredentials(WORKSPACE_ID);

      expect(result).toEqual({
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        region: "us-east-1",
      });
    });

    it("should throw NotFoundException when no credentials exist", async () => {
      credentialRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDecryptedCredentials(WORKSPACE_ID)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteCredentials", () => {
    it("should delete credentials when no active instances exist", async () => {
      const credential = { id: "cred-1", workspaceId: WORKSPACE_ID } as any;
      credentialRepo.findOne.mockResolvedValue(credential);
      instanceRepo.count.mockResolvedValue(0);

      await service.deleteCredentials(WORKSPACE_ID);

      expect(credentialRepo.remove).toHaveBeenCalledWith(credential);
    });

    it("should throw ConflictException when active instances exist", async () => {
      const credential = { id: "cred-1", workspaceId: WORKSPACE_ID } as any;
      credentialRepo.findOne.mockResolvedValue(credential);
      instanceRepo.count.mockResolvedValue(2);

      await expect(service.deleteCredentials(WORKSPACE_ID)).rejects.toThrow(
        ConflictException
      );

      expect(credentialRepo.remove).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when credentials do not exist", async () => {
      credentialRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteCredentials(WORKSPACE_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should check for PROVISIONING, RUNNING, and STOPPED instances", async () => {
      const credential = { id: "cred-1", workspaceId: WORKSPACE_ID } as any;
      credentialRepo.findOne.mockResolvedValue(credential);
      instanceRepo.count.mockResolvedValue(0);

      await service.deleteCredentials(WORKSPACE_ID);

      expect(instanceRepo.count).toHaveBeenCalledWith({
        where: {
          awsCredentialId: "cred-1",
          status: expect.objectContaining({
            _type: "in",
            _value: expect.arrayContaining([
              "PROVISIONING",
              "RUNNING",
              "STOPPED",
            ]),
          }),
        },
      });
    });
  });
});
