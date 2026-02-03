import "reflect-metadata";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerStorage, ThrottlerLimitDetail } from "@nestjs/throttler";
import { CustomThrottleGuard } from "../custom-throttle.guard";
import {
  CUSTOM_THROTTLE_KEY,
  SKIP_CUSTOM_THROTTLE_KEY,
  CustomThrottleOptions,
} from "../../decorators/custom-throttle.decorator";

describe("CustomThrottleGuard", () => {
  let guard: CustomThrottleGuard;
  let reflector: Reflector;
  let mockStorage: jest.Mocked<ThrottlerStorage>;

  const createMockContext = (overrides?: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
    user?: { id: string };
  }): ExecutionContext => {
    const request = {
      headers: overrides?.headers ?? {},
      ip: overrides?.ip ?? "127.0.0.1",
      user: overrides?.user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({
          header: jest.fn(),
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
      getType: () => "http",
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockStorage = {
      increment: jest.fn().mockResolvedValue({
        totalHits: 1,
        timeToExpire: 60000,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    } as unknown as jest.Mocked<ThrottlerStorage>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomThrottleGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: "THROTTLER:MODULE_OPTIONS",
          useValue: {
            throttlers: [{ limit: 100, ttl: 60000, name: "default" }],
            setHeaders: true,
          },
        },
        {
          provide: ThrottlerStorage,
          useValue: mockStorage,
        },
      ],
    }).compile();

    guard = module.get<CustomThrottleGuard>(CustomThrottleGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe("canActivate", () => {
    it("should return true when SkipCustomThrottle is applied", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === SKIP_CUSTOM_THROTTLE_KEY) return true;
        return undefined;
      });

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should call parent canActivate when not skipped", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      // Mock the parent's canActivate by overriding it
      const parentCanActivate = jest
        .spyOn(Object.getPrototypeOf(CustomThrottleGuard.prototype), "canActivate")
        .mockResolvedValue(true);

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      parentCanActivate.mockRestore();
    });
  });

  describe("getTracker", () => {
    it("should extract IP from x-forwarded-for header", async () => {
      const req = {
        headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
        ip: "127.0.0.1",
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe("10.0.0.1");
    });

    it("should extract IP from x-real-ip header when x-forwarded-for is absent", async () => {
      const req = {
        headers: { "x-real-ip": "10.0.0.5" },
        ip: "127.0.0.1",
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe("10.0.0.5");
    });

    it("should fall back to req.ip when no proxy headers", async () => {
      const req = {
        headers: {},
        ip: "192.168.1.1",
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe("192.168.1.1");
    });

    it("should return unknown when no IP is available", async () => {
      const req = {
        headers: {},
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe("unknown");
    });
  });

  describe("handleRequest", () => {
    const createRequestProps = (context: ExecutionContext) => ({
      context,
      limit: 100,
      ttl: 60000,
      throttler: { name: "default", limit: 100, ttl: 60000 } as unknown as ThrottlerLimitDetail,
      blockDuration: 0,
      getTracker: jest.fn().mockResolvedValue("127.0.0.1"),
      generateKey: jest.fn().mockReturnValue("default:127.0.0.1"),
    });

    it("should use custom throttle options when decorator is present", async () => {
      const customOptions: CustomThrottleOptions = {
        limit: 5,
        ttl: 300000,
        keyGenerator: () => "custom:test-key",
      };

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === CUSTOM_THROTTLE_KEY) return customOptions;
        return undefined;
      });

      const parentHandleRequest = jest
        .spyOn(Object.getPrototypeOf(CustomThrottleGuard.prototype), "handleRequest")
        .mockResolvedValue(true);

      const context = createMockContext();
      const requestProps = createRequestProps(context);

      await (guard as any).handleRequest(requestProps);

      expect(parentHandleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          ttl: 300000,
        })
      );

      parentHandleRequest.mockRestore();
    });

    it("should use byIp as default key generator when none specified", async () => {
      const customOptions: CustomThrottleOptions = {
        limit: 10,
        ttl: 60000,
      };

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === CUSTOM_THROTTLE_KEY) return customOptions;
        return undefined;
      });

      const parentHandleRequest = jest
        .spyOn(Object.getPrototypeOf(CustomThrottleGuard.prototype), "handleRequest")
        .mockResolvedValue(true);

      const context = createMockContext({ ip: "192.168.1.1" });
      const requestProps = createRequestProps(context);

      await (guard as any).handleRequest(requestProps);

      // Verify that the getTracker function returns IP-based key
      const calledWith = parentHandleRequest.mock.calls[0][0] as { getTracker: () => Promise<string> };
      const trackerResult = await calledWith.getTracker();
      expect(trackerResult).toBe("ip:192.168.1.1");

      parentHandleRequest.mockRestore();
    });

    it("should use default behavior when no custom throttle decorator", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const parentHandleRequest = jest
        .spyOn(Object.getPrototypeOf(CustomThrottleGuard.prototype), "handleRequest")
        .mockResolvedValue(true);

      const context = createMockContext();
      const requestProps = createRequestProps(context);

      await (guard as any).handleRequest(requestProps);

      // Should pass through original props
      expect(parentHandleRequest).toHaveBeenCalledWith(requestProps);

      parentHandleRequest.mockRestore();
    });

    it("should generate proper key format with throttler name", async () => {
      const customOptions: CustomThrottleOptions = {
        limit: 5,
        ttl: 300000,
        keyGenerator: () => "user:123",
      };

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === CUSTOM_THROTTLE_KEY) return customOptions;
        return undefined;
      });

      const parentHandleRequest = jest
        .spyOn(Object.getPrototypeOf(CustomThrottleGuard.prototype), "handleRequest")
        .mockResolvedValue(true);

      const context = createMockContext();
      const requestProps = createRequestProps(context);

      await (guard as any).handleRequest(requestProps);

      const calledWith = parentHandleRequest.mock.calls[0][0] as {
        generateKey: (ctx: ExecutionContext, tracker: string, throttlerName: string) => string
      };
      const generatedKey = calledWith.generateKey(context, "user:123", "default");
      expect(generatedKey).toBe("default:user:123");

      parentHandleRequest.mockRestore();
    });
  });
});

describe("CustomThrottleGuard Integration", () => {
  describe("with different key generators", () => {
    let guard: CustomThrottleGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const mockStorage = {
        increment: jest.fn().mockResolvedValue({
          totalHits: 1,
          timeToExpire: 60000,
          isBlocked: false,
          timeToBlockExpire: 0,
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CustomThrottleGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          {
            provide: "THROTTLER:MODULE_OPTIONS",
            useValue: {
              throttlers: [{ limit: 100, ttl: 60000, name: "default" }],
              setHeaders: true,
            },
          },
          {
            provide: ThrottlerStorage,
            useValue: mockStorage,
          },
        ],
      }).compile();

      guard = module.get<CustomThrottleGuard>(CustomThrottleGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    it("should track different users separately", async () => {
      const keyGeneratorByUser = (ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest();
        return `user:${req.user?.id ?? "anonymous"}`;
      };

      const customOptions: CustomThrottleOptions = {
        limit: 5,
        ttl: 60000,
        keyGenerator: keyGeneratorByUser,
      };

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === CUSTOM_THROTTLE_KEY) return customOptions;
        return undefined;
      });

      const parentHandleRequest = jest
        .spyOn(Object.getPrototypeOf(CustomThrottleGuard.prototype), "handleRequest")
        .mockResolvedValue(true);

      // User 1
      const context1 = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: "user-1" } }),
          getResponse: () => ({ header: jest.fn() }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => class {},
      } as unknown as ExecutionContext;

      // User 2
      const context2 = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: "user-2" } }),
          getResponse: () => ({ header: jest.fn() }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => class {},
      } as unknown as ExecutionContext;

      const requestProps1 = {
        context: context1,
        limit: 100,
        ttl: 60000,
        throttler: { name: "default" } as unknown as ThrottlerLimitDetail,
        blockDuration: 0,
        getTracker: jest.fn(),
        generateKey: jest.fn(),
      };

      const requestProps2 = {
        context: context2,
        limit: 100,
        ttl: 60000,
        throttler: { name: "default" } as unknown as ThrottlerLimitDetail,
        blockDuration: 0,
        getTracker: jest.fn(),
        generateKey: jest.fn(),
      };

      await (guard as any).handleRequest(requestProps1);
      await (guard as any).handleRequest(requestProps2);

      const call1 = parentHandleRequest.mock.calls[0][0] as { getTracker: () => Promise<string> };
      const call2 = parentHandleRequest.mock.calls[1][0] as { getTracker: () => Promise<string> };

      const key1 = await call1.getTracker();
      const key2 = await call2.getTracker();

      expect(key1).toBe("user:user-1");
      expect(key2).toBe("user:user-2");

      parentHandleRequest.mockRestore();
    });

    it("should apply correct rate limit values from decorator", async () => {
      const customOptions: CustomThrottleOptions = {
        limit: 3,
        ttl: 120000,
      };

      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === CUSTOM_THROTTLE_KEY) return customOptions;
        return undefined;
      });

      const parentHandleRequest = jest
        .spyOn(Object.getPrototypeOf(CustomThrottleGuard.prototype), "handleRequest")
        .mockResolvedValue(true);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ ip: "127.0.0.1", headers: {} }),
          getResponse: () => ({ header: jest.fn() }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => class {},
      } as unknown as ExecutionContext;

      const requestProps = {
        context,
        limit: 100,
        ttl: 60000,
        throttler: { name: "default" } as unknown as ThrottlerLimitDetail,
        blockDuration: 0,
        getTracker: jest.fn(),
        generateKey: jest.fn(),
      };

      await (guard as any).handleRequest(requestProps);

      expect(parentHandleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 3,
          ttl: 120000,
        })
      );

      parentHandleRequest.mockRestore();
    });
  });
});
