import "reflect-metadata";
import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  Param,
} from "@nestjs/common";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AuditLog } from "@/common/decorators";
import { AuditLogService } from "@/audit-logs/audit-logs.service";
import { AuditLogInterceptor } from "../audit.interceptor";

@Controller("audit")
class AuditTestController {
  @Get("success/:taskId")
  @AuditLog("TASK_UPDATE", "task")
  success(@Param("taskId") taskId: string) {
    return { ok: true, id: taskId };
  }

  @Get("failure/:taskId")
  @AuditLog("TASK_DELETE", "task")
  failure() {
    throw new BadRequestException("boom");
  }

  @Get("no-audit")
  noAudit() {
    return { ok: true };
  }
}

describe("AuditLogInterceptor Integration", () => {
  let app: INestApplication;
  let auditLogService: { log: jest.Mock };

  beforeAll(async () => {
    auditLogService = {
      log: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuditTestController],
      providers: [
        Reflector,
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: AuditLogInterceptor,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use((req, _res, next) => {
      req.user = {
        authType: "jwt",
        id: "user-123",
        email: "user@example.com",
        name: "User",
        role: "USER",
      };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    auditLogService.log.mockClear();
  });

  it("logs successful actions with resource context", async () => {
    const response = await request(app.getHttpServer())
      .get("/audit/success/task-123")
      .set("X-Forwarded-For", "203.0.113.10")
      .set("User-Agent", "jest-agent")
      .expect(200);

    expect(response.body).toEqual({ ok: true, id: "task-123" });
    expect(auditLogService.log).toHaveBeenCalledTimes(1);
    expect(auditLogService.log).toHaveBeenCalledWith(
      "TASK_UPDATE",
      "task",
      "user-123",
      expect.objectContaining({
        status: "success",
        method: "GET",
        path: "/audit/success/task-123",
      }),
      expect.objectContaining({
        ipAddress: "203.0.113.10",
        userAgent: "jest-agent",
        resourceId: "task-123",
      })
    );
  });

  it("logs failed actions with error metadata", async () => {
    await request(app.getHttpServer())
      .get("/audit/failure/task-999")
      .set("X-Real-IP", "198.51.100.7")
      .set("User-Agent", "jest-agent")
      .expect(400);

    expect(auditLogService.log).toHaveBeenCalledTimes(1);
    expect(auditLogService.log).toHaveBeenCalledWith(
      "TASK_DELETE",
      "task",
      "user-123",
      expect.objectContaining({
        status: "failure",
        method: "GET",
        path: "/audit/failure/task-999",
        errorName: "BadRequestException",
        errorMessage: expect.any(String),
      }),
      expect.objectContaining({
        ipAddress: "198.51.100.7",
        userAgent: "jest-agent",
        resourceId: "task-999",
      })
    );
  });

  it("skips audit logging when no decorator is present", async () => {
    await request(app.getHttpServer()).get("/audit/no-audit").expect(200);

    expect(auditLogService.log).not.toHaveBeenCalled();
  });
});
