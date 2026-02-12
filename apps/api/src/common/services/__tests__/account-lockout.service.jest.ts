import "reflect-metadata";

import { AccountLockoutService } from "../account-lockout.service";

describe("AccountLockoutService", () => {
  let service: AccountLockoutService;

  beforeEach(() => {
    service = new AccountLockoutService(5, 15 * 60 * 1000);
  });

  describe("isLocked", () => {
    it("should return false for unknown email", () => {
      expect(service.isLocked("unknown@example.com")).toBe(false);
    });

    it("should return false when attempts are below threshold", () => {
      service.recordFailedAttempt("test@example.com");
      service.recordFailedAttempt("test@example.com");
      expect(service.isLocked("test@example.com")).toBe(false);
    });

    it("should return true after reaching max attempts", () => {
      const email = "test@example.com";
      for (let i = 0; i < 5; i++) {
        service.recordFailedAttempt(email);
      }
      expect(service.isLocked(email)).toBe(true);
    });

    it("should auto-unlock after lockout duration expires", () => {
      const email = "test@example.com";
      // Use a very short lockout duration
      service = new AccountLockoutService(2, 1); // 1ms lockout

      service.recordFailedAttempt(email);
      service.recordFailedAttempt(email);
      expect(service.isLocked(email)).toBe(true);

      // Wait for lockout to expire
      jest.useFakeTimers();
      jest.advanceTimersByTime(10);
      expect(service.isLocked(email)).toBe(false);
      jest.useRealTimers();
    });
  });

  describe("recordFailedAttempt", () => {
    it("should increment failed attempts", () => {
      const email = "test@example.com";
      const result1 = service.recordFailedAttempt(email);
      expect(result1.locked).toBe(false);
      expect(result1.attemptsRemaining).toBe(4);

      const result2 = service.recordFailedAttempt(email);
      expect(result2.locked).toBe(false);
      expect(result2.attemptsRemaining).toBe(3);
    });

    it("should lock account after max attempts", () => {
      const email = "test@example.com";
      let result: { locked: boolean; attemptsRemaining: number };
      for (let i = 0; i < 4; i++) {
        result = service.recordFailedAttempt(email);
        expect(result.locked).toBe(false);
      }

      result = service.recordFailedAttempt(email);
      expect(result.locked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
    });

    it("should trigger lockout at exactly the threshold", () => {
      const email = "test@example.com";

      // 4 attempts should not lock
      for (let i = 0; i < 4; i++) {
        const result = service.recordFailedAttempt(email);
        expect(result.locked).toBe(false);
      }

      // 5th attempt should lock
      const result = service.recordFailedAttempt(email);
      expect(result.locked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
    });
  });

  describe("recordSuccess", () => {
    it("should reset failed attempts on successful login", () => {
      const email = "test@example.com";
      service.recordFailedAttempt(email);
      service.recordFailedAttempt(email);
      expect(service.getFailedAttempts(email)).toBe(2);

      service.recordSuccess(email);
      expect(service.getFailedAttempts(email)).toBe(0);
      expect(service.isLocked(email)).toBe(false);
    });
  });

  describe("getFailedAttempts", () => {
    it("should return 0 for unknown email", () => {
      expect(service.getFailedAttempts("unknown@example.com")).toBe(0);
    });

    it("should return correct count", () => {
      const email = "test@example.com";
      service.recordFailedAttempt(email);
      service.recordFailedAttempt(email);
      service.recordFailedAttempt(email);
      expect(service.getFailedAttempts(email)).toBe(3);
    });
  });

  describe("isolation between accounts", () => {
    it("should track lockout independently per email", () => {
      const email1 = "user1@example.com";
      const email2 = "user2@example.com";

      // Lock email1
      for (let i = 0; i < 5; i++) {
        service.recordFailedAttempt(email1);
      }

      expect(service.isLocked(email1)).toBe(true);
      expect(service.isLocked(email2)).toBe(false);
      expect(service.getFailedAttempts(email2)).toBe(0);
    });
  });
});
