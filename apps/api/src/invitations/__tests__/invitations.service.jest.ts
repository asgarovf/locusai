import "reflect-metadata";
import "../../test-setup";
import { MembershipRole } from "@locusai/shared";
import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "@/common/services/email.service";
import { Invitation } from "@/entities/invitation.entity";
import { Membership } from "@/entities/membership.entity";
import { Organization } from "@/entities/organization.entity";
import { User } from "@/entities/user.entity";
import { InvitationsService } from "../invitations.service";

describe("InvitationsService", () => {
  let service: InvitationsService;
  let invitationRepo: jest.Mocked<Repository<Invitation>>;
  let orgRepo: jest.Mocked<Repository<Organization>>;
  let membershipRepo: jest.Mocked<Repository<Membership>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: getRepositoryToken(Invitation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Membership),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { sendInvitationEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    invitationRepo = module.get(getRepositoryToken(Invitation));
    orgRepo = module.get(getRepositoryToken(Organization));
    membershipRepo = module.get(getRepositoryToken(Membership));
    userRepo = module.get(getRepositoryToken(User));
    emailService = module.get(EmailService);
  });

  describe("create", () => {
    it("should create an invitation and send an email", async () => {
      const data = {
        email: "test@example.com",
        orgId: "org-1",
        role: MembershipRole.MEMBER,
        invitedByUserId: "user-1",
      };

      orgRepo.findOne.mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      } as any);
      userRepo.findOne.mockResolvedValueOnce({
        id: "user-1",
        name: "Inviter",
      } as any); // Inviter
      userRepo.findOne.mockResolvedValueOnce(null); // Existing user check
      invitationRepo.create.mockReturnValue({
        ...data,
        token: "token-1",
      } as any);
      invitationRepo.save.mockResolvedValue({
        ...data,
        token: "token-1",
      } as any);

      const result = await service.create(data);

      expect(result.token).toBe("token-1");
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
    });

    it("should throw ConflictException if user is already a member", async () => {
      const data = {
        email: "test@example.com",
        orgId: "org-1",
        role: MembershipRole.MEMBER,
        invitedByUserId: "user-1",
      };

      orgRepo.findOne.mockResolvedValue({ id: "org-1" } as any);
      userRepo.findOne.mockResolvedValueOnce({ id: "user-1" } as any); // Inviter
      userRepo.findOne.mockResolvedValueOnce({
        id: "user-2",
        email: data.email,
      } as any); // Existing user
      membershipRepo.findOne.mockResolvedValue({ id: "mem-1" } as any);

      await expect(service.create(data)).rejects.toThrow(ConflictException);
    });
  });
});
