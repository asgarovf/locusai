import "reflect-metadata";
import { ExecutionContext } from "@nestjs/common";
import {
  CUSTOM_THROTTLE_KEY,
  SKIP_CUSTOM_THROTTLE_KEY,
  CustomThrottle,
  SkipCustomThrottle,
  byIp,
  byUserId,
  byEmail,
  byUserIdAndIp,
  byField,
  CustomThrottleOptions,
} from "../custom-throttle.decorator";

describe("CustomThrottle Decorator", () => {
  describe("CustomThrottle", () => {
    it("should set metadata with correct options", () => {
      const options: CustomThrottleOptions = {
        limit: 10,
        ttl: 60000,
      };

      class TestClass {
        @CustomThrottle(options)
        testMethod() {
          // Test method for decorator testing
        }
      }

      const metadata = Reflect.getMetadata(
        CUSTOM_THROTTLE_KEY,
        TestClass.prototype.testMethod
      );

      expect(metadata).toEqual(options);
    });

    it("should set metadata with custom key generator", () => {
      const keyGenerator = jest.fn();
      const options: CustomThrottleOptions = {
        limit: 5,
        ttl: 300000,
        keyGenerator,
      };

      class TestClass {
        @CustomThrottle(options)
        testMethod() {
          // Test method for decorator testing
        }
      }

      const metadata = Reflect.getMetadata(
        CUSTOM_THROTTLE_KEY,
        TestClass.prototype.testMethod
      );

      expect(metadata).toEqual(options);
      expect(metadata.keyGenerator).toBe(keyGenerator);
    });
  });

  describe("SkipCustomThrottle", () => {
    it("should set skip metadata to true", () => {
      class TestClass {
        @SkipCustomThrottle()
        testMethod() {
          // Test method for decorator testing
        }
      }

      const metadata = Reflect.getMetadata(
        SKIP_CUSTOM_THROTTLE_KEY,
        TestClass.prototype.testMethod
      );

      expect(metadata).toBe(true);
    });
  });
});

describe("Key Generator Functions", () => {
  // Helper to create a valid JWT user mock
  const createJwtUser = (id: string) => ({
    authType: "jwt" as const,
    id,
    email: "test@example.com",
    name: "Test User",
    role: "admin" as const,
    orgId: null,
    workspaceId: null,
  });

  const createMockContext = (overrides: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
    user?: ReturnType<typeof createJwtUser>;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
  }): ExecutionContext => {
    const request = {
      headers: overrides.headers ?? {},
      ip: overrides.ip ?? "127.0.0.1",
      user: overrides.user,
      body: overrides.body ?? {},
      query: overrides.query ?? {},
      params: overrides.params ?? {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  describe("byIp", () => {
    it("should generate key from direct IP address", () => {
      const context = createMockContext({ ip: "192.168.1.1" });
      const generator = byIp();

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });

    it("should generate key from x-forwarded-for header (single IP)", () => {
      const context = createMockContext({
        headers: { "x-forwarded-for": "10.0.0.1" },
        ip: "127.0.0.1",
      });
      const generator = byIp();

      const key = generator(context);

      expect(key).toBe("ip:10.0.0.1");
    });

    it("should generate key from first IP in x-forwarded-for header (multiple IPs)", () => {
      const context = createMockContext({
        headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3" },
        ip: "127.0.0.1",
      });
      const generator = byIp();

      const key = generator(context);

      expect(key).toBe("ip:10.0.0.1");
    });

    it("should generate key from x-forwarded-for header (array format)", () => {
      const context = createMockContext({
        headers: { "x-forwarded-for": ["10.0.0.1", "10.0.0.2"] as unknown as string },
        ip: "127.0.0.1",
      });
      const generator = byIp();

      const key = generator(context);

      expect(key).toBe("ip:10.0.0.1");
    });

    it("should generate key from x-real-ip header when x-forwarded-for is absent", () => {
      const context = createMockContext({
        headers: { "x-real-ip": "10.0.0.5" },
        ip: "127.0.0.1",
      });
      const generator = byIp();

      const key = generator(context);

      expect(key).toBe("ip:10.0.0.5");
    });

    it("should return fallback IP when ip is undefined", () => {
      // Create a context where ip is explicitly undefined
      const request = {
        headers: {},
        ip: undefined,
        user: undefined,
        body: {},
        query: {},
        params: {},
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;
      const generator = byIp();

      const key = generator(context);

      // When ip is undefined, the function returns "unknown"
      expect(key).toBe("ip:unknown");
    });

    it("should trim whitespace from forwarded IP", () => {
      const context = createMockContext({
        headers: { "x-forwarded-for": "  10.0.0.1  , 10.0.0.2" },
        ip: "127.0.0.1",
      });
      const generator = byIp();

      const key = generator(context);

      expect(key).toBe("ip:10.0.0.1");
    });
  });

  describe("byUserId", () => {
    it("should generate key from authenticated JWT user ID", () => {
      const context = createMockContext({
        user: createJwtUser("user-123"),
        ip: "192.168.1.1",
      });
      const generator = byUserId();

      const key = generator(context);

      expect(key).toBe("user:user-123");
    });

    it("should generate key from authenticated JWT user with different ID", () => {
      const context = createMockContext({
        user: createJwtUser("user-456"),
        ip: "192.168.1.1",
      });
      const generator = byUserId();

      const key = generator(context);

      expect(key).toBe("user:user-456");
    });

    it("should fall back to IP when user is not authenticated", () => {
      const context = createMockContext({
        ip: "192.168.1.1",
      });
      const generator = byUserId();

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });
  });

  describe("byEmail", () => {
    it("should generate key from email in request body (default path)", () => {
      const context = createMockContext({
        body: { email: "Test@Example.com" },
        ip: "192.168.1.1",
      });
      const generator = byEmail();

      const key = generator(context);

      expect(key).toBe("email:test@example.com");
    });

    it("should generate key from email with custom path", () => {
      const context = createMockContext({
        query: { userEmail: "Query@Example.com" },
        ip: "192.168.1.1",
      });
      const generator = byEmail("query.userEmail");

      const key = generator(context);

      expect(key).toBe("email:query@example.com");
    });

    it("should fall back to IP when email is not found", () => {
      const context = createMockContext({
        body: {},
        ip: "192.168.1.1",
      });
      const generator = byEmail();

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });

    it("should fall back to IP when email is empty string", () => {
      const context = createMockContext({
        body: { email: "" },
        ip: "192.168.1.1",
      });
      const generator = byEmail();

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });

    it("should fall back to IP when email is not a string", () => {
      const context = createMockContext({
        body: { email: 12345 },
        ip: "192.168.1.1",
      });
      const generator = byEmail();

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });

    it("should handle nested paths", () => {
      const context = createMockContext({
        body: { user: { contact: { email: "Nested@Example.com" } } },
        ip: "192.168.1.1",
      });
      const generator = byEmail("body.user.contact.email");

      const key = generator(context);

      expect(key).toBe("email:nested@example.com");
    });

    it("should fall back to IP when nested path does not exist", () => {
      const context = createMockContext({
        body: { user: {} },
        ip: "192.168.1.1",
      });
      const generator = byEmail("body.user.contact.email");

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });
  });

  describe("byUserIdAndIp", () => {
    it("should generate composite key for authenticated user", () => {
      const context = createMockContext({
        user: createJwtUser("user-123"),
        ip: "192.168.1.1",
      });
      const generator = byUserIdAndIp();

      const key = generator(context);

      expect(key).toBe("user:user-123:ip:192.168.1.1");
    });

    it("should fall back to IP only when user is not authenticated", () => {
      const context = createMockContext({
        ip: "192.168.1.1",
      });
      const generator = byUserIdAndIp();

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });

    it("should use x-forwarded-for IP for authenticated user", () => {
      const context = createMockContext({
        user: createJwtUser("user-123"),
        headers: { "x-forwarded-for": "10.0.0.1" },
        ip: "127.0.0.1",
      });
      const generator = byUserIdAndIp();

      const key = generator(context);

      expect(key).toBe("user:user-123:ip:10.0.0.1");
    });
  });

  describe("byField", () => {
    it("should generate key from params field", () => {
      const context = createMockContext({
        params: { workspaceId: "ws-123" },
        ip: "192.168.1.1",
      });
      const generator = byField("params.workspaceId", "workspace");

      const key = generator(context);

      expect(key).toBe("workspace:ws-123");
    });

    it("should generate key from headers field", () => {
      const context = createMockContext({
        headers: { "x-tenant-id": "tenant-456" },
        ip: "192.168.1.1",
      });
      const generator = byField("headers.x-tenant-id", "tenant");

      const key = generator(context);

      expect(key).toBe("tenant:tenant-456");
    });

    it("should use default prefix when not specified", () => {
      const context = createMockContext({
        body: { resourceId: "res-789" },
        ip: "192.168.1.1",
      });
      const generator = byField("body.resourceId");

      const key = generator(context);

      expect(key).toBe("custom:res-789");
    });

    it("should fall back to IP when field is not found", () => {
      const context = createMockContext({
        params: {},
        ip: "192.168.1.1",
      });
      const generator = byField("params.workspaceId", "workspace");

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });

    it("should handle numeric values", () => {
      const context = createMockContext({
        params: { itemId: 42 },
        ip: "192.168.1.1",
      });
      const generator = byField("params.itemId", "item");

      const key = generator(context);

      expect(key).toBe("item:42");
    });

    it("should handle null values by falling back to IP", () => {
      const context = createMockContext({
        body: { value: null },
        ip: "192.168.1.1",
      });
      const generator = byField("body.value", "test");

      const key = generator(context);

      expect(key).toBe("ip:192.168.1.1");
    });

    it("should handle boolean values", () => {
      const context = createMockContext({
        body: { isActive: true },
        ip: "192.168.1.1",
      });
      const generator = byField("body.isActive", "flag");

      const key = generator(context);

      expect(key).toBe("flag:true");
    });
  });
});
