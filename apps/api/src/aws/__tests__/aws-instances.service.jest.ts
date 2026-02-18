import "reflect-metadata";
import "../../test-setup";

import { InstanceAction, InstanceStatus } from "@locusai/shared";
import {
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AwsInstance } from "@/entities/aws-instance.entity";
import { AwsCredentialsService } from "../aws-credentials.service";
import { AwsEc2Service } from "../aws-ec2.service";
import { AwsInstancesService } from "../aws-instances.service";

describe("AwsInstancesService", () => {
  let service: AwsInstancesService;
  let instanceRepo: jest.Mocked<Repository<AwsInstance>>;
  let credentialsService: jest.Mocked<AwsCredentialsService>;
  let ec2Service: jest.Mocked<AwsEc2Service>;
  let configService: jest.Mocked<ConfigService>;

  const WORKSPACE_ID = "workspace-123";
  const INSTANCE_ID = "instance-456";
  const EC2_INSTANCE_ID = "i-0abc123def456";
  const CREDENTIAL_ID = "cred-789";

  const mockCredentials = {
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
  };

  const mockProvisionDto = {
    repoUrl: "https://github.com/user/repo",
    githubToken: "ghp_test_token_123",
    instanceType: "t3.small" as const,
    integrations: [],
  };

  beforeEach(async () => {
    // Use fake timers to control setTimeout used by pollInstanceStatus
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsInstancesService,
        {
          provide: getRepositoryToken(AwsInstance),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: AwsCredentialsService,
          useValue: {
            getDecryptedCredentials: jest.fn(),
            getCredentials: jest.fn(),
          },
        },
        {
          provide: AwsEc2Service,
          useValue: {
            launchInstance: jest.fn(),
            describeInstance: jest.fn(),
            startInstance: jest.fn(),
            stopInstance: jest.fn(),
            terminateInstance: jest.fn(),
            createSecurityGroup: jest.fn(),
            deleteSecurityGroup: jest.fn(),
            getSecurityGroupRules: jest.fn(),
            updateSecurityGroupIngress: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AwsInstancesService>(AwsInstancesService);
    instanceRepo = module.get(getRepositoryToken(AwsInstance));
    credentialsService = module.get(AwsCredentialsService);
    ec2Service = module.get(AwsEc2Service);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("provisionInstance", () => {
    it("should create a DB record and call launchInstance", async () => {
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      credentialsService.getCredentials.mockResolvedValue({
        id: CREDENTIAL_ID,
        accessKeyId: "****MPLE",
        region: "us-east-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const savedInstance = {
        id: INSTANCE_ID,
        workspaceId: WORKSPACE_ID,
        awsCredentialId: CREDENTIAL_ID,
        status: InstanceStatus.PROVISIONING,
        instanceType: "t3.small",
        region: "us-east-1",
        repoUrl: mockProvisionDto.repoUrl,
        githubToken: mockProvisionDto.githubToken,
        integrations: [],
        ec2InstanceId: null,
        securityGroupId: null,
      } as any;

      instanceRepo.create.mockReturnValue(savedInstance);
      instanceRepo.save.mockResolvedValue(savedInstance);
      ec2Service.createSecurityGroup.mockResolvedValue("sg-12345");
      ec2Service.launchInstance.mockResolvedValue(EC2_INSTANCE_ID);
      configService.get.mockReturnValue(undefined);

      const result = await service.provisionInstance(
        WORKSPACE_ID,
        mockProvisionDto
      );

      expect(instanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          status: InstanceStatus.PROVISIONING,
          instanceType: "t3.small",
          repoUrl: mockProvisionDto.repoUrl,
          githubToken: mockProvisionDto.githubToken,
        })
      );
      expect(instanceRepo.save).toHaveBeenCalled();
      expect(ec2Service.createSecurityGroup).toHaveBeenCalledWith(
        mockCredentials,
        expect.objectContaining({
          groupName: `locus-instance-${INSTANCE_ID}`,
        })
      );
      expect(ec2Service.launchInstance).toHaveBeenCalledWith(
        mockCredentials,
        expect.objectContaining({
          instanceType: "t3.small",
          securityGroupName: `locus-instance-${INSTANCE_ID}`,
        })
      );
      expect(result.ec2InstanceId).toBe(EC2_INSTANCE_ID);
    });

    it("should set status to ERROR when provisioning fails", async () => {
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      credentialsService.getCredentials.mockResolvedValue({
        id: CREDENTIAL_ID,
      } as any);

      const savedInstance = {
        id: INSTANCE_ID,
        status: InstanceStatus.PROVISIONING,
        ec2InstanceId: null,
        securityGroupId: null,
      } as any;

      instanceRepo.create.mockReturnValue(savedInstance);
      instanceRepo.save.mockResolvedValue(savedInstance);
      ec2Service.createSecurityGroup.mockRejectedValue(
        new Error("AWS security group error")
      );

      const result = await service.provisionInstance(
        WORKSPACE_ID,
        mockProvisionDto
      );

      expect(result.status).toBe(InstanceStatus.ERROR);
      expect(result.errorMessage).toBe("AWS security group error");
    });

    it("should fail when no credentials are configured", async () => {
      credentialsService.getDecryptedCredentials.mockRejectedValue(
        new NotFoundException("No AWS credentials found")
      );

      await expect(
        service.provisionInstance(WORKSPACE_ID, mockProvisionDto)
      ).rejects.toThrow(BadRequestException);
    });

    it("should use default AMI when LOCUS_AMI_ID is not set", async () => {
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      credentialsService.getCredentials.mockResolvedValue({
        id: CREDENTIAL_ID,
      } as any);

      const savedInstance = {
        id: INSTANCE_ID,
        status: InstanceStatus.PROVISIONING,
      } as any;

      instanceRepo.create.mockReturnValue(savedInstance);
      instanceRepo.save.mockResolvedValue(savedInstance);
      ec2Service.createSecurityGroup.mockResolvedValue("sg-12345");
      ec2Service.launchInstance.mockResolvedValue(EC2_INSTANCE_ID);
      configService.get.mockReturnValue(undefined);

      await service.provisionInstance(WORKSPACE_ID, mockProvisionDto);

      expect(ec2Service.launchInstance).toHaveBeenCalledWith(
        mockCredentials,
        expect.objectContaining({
          amiId: "ami-0c02fb55956c7d316",
        })
      );
    });

    it("should use custom AMI when LOCUS_AMI_ID is set", async () => {
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      credentialsService.getCredentials.mockResolvedValue({
        id: CREDENTIAL_ID,
      } as any);

      const savedInstance = {
        id: INSTANCE_ID,
        status: InstanceStatus.PROVISIONING,
      } as any;

      instanceRepo.create.mockReturnValue(savedInstance);
      instanceRepo.save.mockResolvedValue(savedInstance);
      ec2Service.createSecurityGroup.mockResolvedValue("sg-12345");
      ec2Service.launchInstance.mockResolvedValue(EC2_INSTANCE_ID);
      configService.get.mockReturnValue("ami-custom123");

      await service.provisionInstance(WORKSPACE_ID, mockProvisionDto);

      expect(ec2Service.launchInstance).toHaveBeenCalledWith(
        mockCredentials,
        expect.objectContaining({
          amiId: "ami-custom123",
        })
      );
    });
  });

  describe("getInstance", () => {
    it("should return instance and refresh status from AWS", async () => {
      const instance = {
        id: INSTANCE_ID,
        workspaceId: WORKSPACE_ID,
        ec2InstanceId: EC2_INSTANCE_ID,
        status: InstanceStatus.RUNNING,
        publicIp: null,
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      ec2Service.describeInstance.mockResolvedValue({
        state: "running",
        publicIp: "54.123.45.67",
      });
      instanceRepo.save.mockResolvedValue(instance);

      const result = await service.getInstance(WORKSPACE_ID, INSTANCE_ID);

      expect(result).toBeDefined();
      expect(ec2Service.describeInstance).toHaveBeenCalledWith(
        mockCredentials,
        EC2_INSTANCE_ID
      );
    });

    it("should not refresh status for terminated instances", async () => {
      const instance = {
        id: INSTANCE_ID,
        workspaceId: WORKSPACE_ID,
        ec2InstanceId: EC2_INSTANCE_ID,
        status: InstanceStatus.TERMINATED,
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);

      const result = await service.getInstance(WORKSPACE_ID, INSTANCE_ID);

      expect(result.status).toBe(InstanceStatus.TERMINATED);
      expect(ec2Service.describeInstance).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent instance", async () => {
      instanceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getInstance(WORKSPACE_ID, "non-existent")
      ).rejects.toThrow(NotFoundException);
    });

    it("should not refresh status for instances without ec2InstanceId", async () => {
      const instance = {
        id: INSTANCE_ID,
        workspaceId: WORKSPACE_ID,
        ec2InstanceId: null,
        status: InstanceStatus.PROVISIONING,
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);

      const result = await service.getInstance(WORKSPACE_ID, INSTANCE_ID);

      expect(result.status).toBe(InstanceStatus.PROVISIONING);
      expect(ec2Service.describeInstance).not.toHaveBeenCalled();
    });
  });

  describe("performAction", () => {
    const createInstance = (overrides = {}) =>
      ({
        id: INSTANCE_ID,
        workspaceId: WORKSPACE_ID,
        ec2InstanceId: EC2_INSTANCE_ID,
        status: InstanceStatus.RUNNING,
        securityGroupId: "sg-12345",
        ...overrides,
      }) as any;

    beforeEach(() => {
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
    });

    it("should call stopInstance and set status to STOPPED", async () => {
      const instance = createInstance();
      instanceRepo.findOne.mockResolvedValue(instance);
      instanceRepo.save.mockResolvedValue(instance);

      const result = await service.performAction(
        WORKSPACE_ID,
        INSTANCE_ID,
        InstanceAction.STOP
      );

      expect(ec2Service.stopInstance).toHaveBeenCalledWith(
        mockCredentials,
        EC2_INSTANCE_ID
      );
      expect(result.status).toBe(InstanceStatus.STOPPED);
      expect(instanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InstanceStatus.STOPPED })
      );
    });

    it("should call startInstance and set status to RUNNING", async () => {
      const instance = createInstance({ status: InstanceStatus.STOPPED });
      instanceRepo.findOne.mockResolvedValue(instance);
      instanceRepo.save.mockResolvedValue(instance);

      const result = await service.performAction(
        WORKSPACE_ID,
        INSTANCE_ID,
        InstanceAction.START
      );

      expect(ec2Service.startInstance).toHaveBeenCalledWith(
        mockCredentials,
        EC2_INSTANCE_ID
      );
      expect(result.status).toBe(InstanceStatus.RUNNING);
    });

    it("should call terminateInstance and set status to TERMINATED", async () => {
      const instance = createInstance();
      instanceRepo.findOne.mockResolvedValue(instance);
      instanceRepo.save.mockResolvedValue(instance);

      const result = await service.performAction(
        WORKSPACE_ID,
        INSTANCE_ID,
        InstanceAction.TERMINATE
      );

      expect(ec2Service.terminateInstance).toHaveBeenCalledWith(
        mockCredentials,
        EC2_INSTANCE_ID
      );
      expect(result.status).toBe(InstanceStatus.TERMINATED);
    });

    it("should attempt to delete security group on TERMINATE", async () => {
      const instance = createInstance({ securityGroupId: "sg-12345" });
      instanceRepo.findOne.mockResolvedValue(instance);
      instanceRepo.save.mockResolvedValue(instance);

      await service.performAction(
        WORKSPACE_ID,
        INSTANCE_ID,
        InstanceAction.TERMINATE
      );

      expect(ec2Service.deleteSecurityGroup).toHaveBeenCalledWith(
        mockCredentials,
        "sg-12345"
      );
    });

    it("should not fail if security group deletion fails on TERMINATE", async () => {
      const instance = createInstance({ securityGroupId: "sg-12345" });
      instanceRepo.findOne.mockResolvedValue(instance);
      instanceRepo.save.mockResolvedValue(instance);
      ec2Service.deleteSecurityGroup.mockRejectedValue(
        new Error("SG in use")
      );

      const result = await service.performAction(
        WORKSPACE_ID,
        INSTANCE_ID,
        InstanceAction.TERMINATE
      );

      expect(result.status).toBe(InstanceStatus.TERMINATED);
    });

    it("should throw NotFoundException for non-existent instance", async () => {
      instanceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.performAction(WORKSPACE_ID, "non-existent", InstanceAction.STOP)
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when ec2InstanceId is not assigned", async () => {
      const instance = createInstance({ ec2InstanceId: null });
      instanceRepo.findOne.mockResolvedValue(instance);

      await expect(
        service.performAction(WORKSPACE_ID, INSTANCE_ID, InstanceAction.STOP)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when credentials are not configured", async () => {
      const instance = createInstance();
      instanceRepo.findOne.mockResolvedValue(instance);
      credentialsService.getDecryptedCredentials.mockRejectedValue(
        new NotFoundException("No credentials")
      );

      await expect(
        service.performAction(WORKSPACE_ID, INSTANCE_ID, InstanceAction.STOP)
      ).rejects.toThrow(BadRequestException);
    });

    it("should not attempt to delete security group on TERMINATE when no securityGroupId", async () => {
      const instance = createInstance({ securityGroupId: null });
      instanceRepo.findOne.mockResolvedValue(instance);
      instanceRepo.save.mockResolvedValue(instance);

      await service.performAction(
        WORKSPACE_ID,
        INSTANCE_ID,
        InstanceAction.TERMINATE
      );

      expect(ec2Service.deleteSecurityGroup).not.toHaveBeenCalled();
    });
  });

  describe("listInstances", () => {
    it("should return instances ordered by createdAt DESC", async () => {
      const instances = [
        { id: "inst-1", createdAt: new Date("2024-02-01") },
        { id: "inst-2", createdAt: new Date("2024-01-01") },
      ] as any;

      instanceRepo.find.mockResolvedValue(instances);

      const result = await service.listInstances(WORKSPACE_ID);

      expect(result).toEqual(instances);
      expect(instanceRepo.find).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID },
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("syncInstanceStatus", () => {
    it("should refresh status from AWS", async () => {
      const instance = {
        id: INSTANCE_ID,
        workspaceId: WORKSPACE_ID,
        ec2InstanceId: EC2_INSTANCE_ID,
        status: InstanceStatus.PROVISIONING,
        publicIp: null,
        launchedAt: null,
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      ec2Service.describeInstance.mockResolvedValue({
        state: "running",
        publicIp: "54.123.45.67",
      });
      instanceRepo.save.mockResolvedValue(instance);

      const result = await service.syncInstanceStatus(
        WORKSPACE_ID,
        INSTANCE_ID
      );

      expect(result.status).toBe(InstanceStatus.RUNNING);
      expect(result.publicIp).toBe("54.123.45.67");
      expect(result.launchedAt).toBeInstanceOf(Date);
    });

    it("should throw NotFoundException for non-existent instance", async () => {
      instanceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.syncInstanceStatus(WORKSPACE_ID, "non-existent")
      ).rejects.toThrow(NotFoundException);
    });

    it("should return instance as-is if no ec2InstanceId", async () => {
      const instance = {
        id: INSTANCE_ID,
        workspaceId: WORKSPACE_ID,
        ec2InstanceId: null,
        status: InstanceStatus.PROVISIONING,
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);

      const result = await service.syncInstanceStatus(
        WORKSPACE_ID,
        INSTANCE_ID
      );

      expect(result.status).toBe(InstanceStatus.PROVISIONING);
      expect(ec2Service.describeInstance).not.toHaveBeenCalled();
    });
  });

  describe("getSecurityRules", () => {
    it("should return security group rules", async () => {
      const instance = {
        id: INSTANCE_ID,
        securityGroupId: "sg-12345",
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      ec2Service.getSecurityGroupRules.mockResolvedValue([
        { port: 22, cidr: "0.0.0.0/0", description: "SSH access" },
      ]);

      const result = await service.getSecurityRules(
        WORKSPACE_ID,
        INSTANCE_ID
      );

      expect(result).toEqual([
        { port: 22, cidr: "0.0.0.0/0", description: "SSH access" },
      ]);
    });

    it("should throw BadRequestException when no security group", async () => {
      const instance = {
        id: INSTANCE_ID,
        securityGroupId: null,
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);

      await expect(
        service.getSecurityRules(WORKSPACE_ID, INSTANCE_ID)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateSecurityRules", () => {
    it("should update security group with specified IPs", async () => {
      const instance = {
        id: INSTANCE_ID,
        securityGroupId: "sg-12345",
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      ec2Service.getSecurityGroupRules.mockResolvedValue([
        { port: 22, cidr: "10.0.0.1/32", description: "SSH access" },
      ]);

      await service.updateSecurityRules(WORKSPACE_ID, INSTANCE_ID, [
        "10.0.0.1/32",
      ]);

      expect(ec2Service.updateSecurityGroupIngress).toHaveBeenCalledWith(
        mockCredentials,
        "sg-12345",
        [{ port: 22, cidr: "10.0.0.1/32", description: "SSH access" }]
      );
    });

    it("should default to 0.0.0.0/0 when no IPs specified", async () => {
      const instance = {
        id: INSTANCE_ID,
        securityGroupId: "sg-12345",
      } as any;

      instanceRepo.findOne.mockResolvedValue(instance);
      credentialsService.getDecryptedCredentials.mockResolvedValue(
        mockCredentials as any
      );
      ec2Service.getSecurityGroupRules.mockResolvedValue([]);

      await service.updateSecurityRules(WORKSPACE_ID, INSTANCE_ID, []);

      expect(ec2Service.updateSecurityGroupIngress).toHaveBeenCalledWith(
        mockCredentials,
        "sg-12345",
        [
          {
            port: 22,
            cidr: "0.0.0.0/0",
            description: "SSH access (open)",
          },
        ]
      );
    });
  });
});
