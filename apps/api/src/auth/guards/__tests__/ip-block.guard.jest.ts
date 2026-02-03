import "reflect-metadata";
import "../../../test-setup";

import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { IpBlockService } from "../../ip-block.service";
import { IpBlockGuard } from "../ip-block.guard";

describe("IpBlockGuard", () => {
  let guard: IpBlockGuard;
  let reflector: jest.Mocked<Reflector>;
  let ipBlockService: jest.Mocked<IpBlockService>;

  const createMockExecutionContext = (
    request: Partial<{
      headers: Record<string, string | string[]>;
      ip: string;
      socket: { remoteAddress: string };
    }> = {}
  ): ExecutionContext => {
    const defaultRequest = {
      headers: {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
      ...request,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => defaultRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpBlockGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: IpBlockService,
          useValue: {
            assertNotBlocked: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<IpBlockGuard>(IpBlockGuard);
    reflector = module.get(Reflector);
    ipBlockService = module.get(IpBlockService);
  });

  describe("canActivate", () => {
    it("should allow request when @SkipIpBlock decorator is present", async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(ipBlockService.assertNotBlocked).not.toHaveBeenCalled();
    });

    it("should allow request when IP is not blocked", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      ipBlockService.assertNotBlocked.mockResolvedValue(undefined);
      const context = createMockExecutionContext({
        ip: "192.168.1.100",
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith(
        "192.168.1.100"
      );
    });

    it("should throw ForbiddenException when IP is blocked", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      ipBlockService.assertNotBlocked.mockRejectedValue(
        new ForbiddenException({
          message: "IP blocked",
          code: "IP_BLOCKED",
        })
      );
      const context = createMockExecutionContext({
        ip: "192.168.1.100",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("should allow request when IP cannot be determined", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        headers: {},
        ip: undefined,
        socket: { remoteAddress: undefined as unknown as string },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(ipBlockService.assertNotBlocked).not.toHaveBeenCalled();
    });
  });

  describe("IP extraction", () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      ipBlockService.assertNotBlocked.mockResolvedValue(undefined);
    });

    it("should extract IP from x-forwarded-for header (single IP)", async () => {
      const context = createMockExecutionContext({
        headers: { "x-forwarded-for": "203.0.113.195" },
        ip: "127.0.0.1",
      });

      await guard.canActivate(context);

      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith(
        "203.0.113.195"
      );
    });

    it("should extract first IP from x-forwarded-for header (multiple IPs)", async () => {
      const context = createMockExecutionContext({
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        },
        ip: "127.0.0.1",
      });

      await guard.canActivate(context);

      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith(
        "203.0.113.195"
      );
    });

    it("should handle x-forwarded-for as array", async () => {
      const context = createMockExecutionContext({
        headers: { "x-forwarded-for": ["203.0.113.195", "70.41.3.18"] },
        ip: "127.0.0.1",
      });

      await guard.canActivate(context);

      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith(
        "203.0.113.195"
      );
    });

    it("should trim whitespace from extracted IP", async () => {
      const context = createMockExecutionContext({
        headers: { "x-forwarded-for": "  203.0.113.195  " },
        ip: "127.0.0.1",
      });

      await guard.canActivate(context);

      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith(
        "203.0.113.195"
      );
    });

    it("should fall back to request.ip when no x-forwarded-for", async () => {
      const context = createMockExecutionContext({
        headers: {},
        ip: "10.0.0.1",
      });

      await guard.canActivate(context);

      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith("10.0.0.1");
    });

    it("should fall back to socket.remoteAddress when no request.ip", async () => {
      const context = createMockExecutionContext({
        headers: {},
        ip: undefined,
        socket: { remoteAddress: "172.16.0.1" },
      });

      await guard.canActivate(context);

      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith("172.16.0.1");
    });

    it("should prioritize x-forwarded-for over request.ip", async () => {
      const context = createMockExecutionContext({
        headers: { "x-forwarded-for": "203.0.113.195" },
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      });

      await guard.canActivate(context);

      expect(ipBlockService.assertNotBlocked).toHaveBeenCalledWith(
        "203.0.113.195"
      );
    });
  });

  describe("decorator check", () => {
    it("should check both handler and class for decorator", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      ipBlockService.assertNotBlocked.mockResolvedValue(undefined);
      const context = createMockExecutionContext();

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith("skipIpBlock", [
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });
});
