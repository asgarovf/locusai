import "reflect-metadata";

import { IpReputationService } from "../ip-reputation.service";

describe("IpReputationService", () => {
  let service: IpReputationService;

  beforeEach(() => {
    service = new IpReputationService(10, 60 * 60 * 1000); // threshold 10, TTL 1hr
  });

  describe("recordFailure", () => {
    it("should increment failure count for an IP", () => {
      const ip = "192.168.1.1";
      service.recordFailure(ip);
      expect(service.getFailureCount(ip)).toBe(1);

      service.recordFailure(ip);
      expect(service.getFailureCount(ip)).toBe(2);
    });
  });

  describe("isFlagged", () => {
    it("should return false for unknown IP", () => {
      expect(service.isFlagged("10.0.0.1")).toBe(false);
    });

    it("should return false below threshold", () => {
      const ip = "192.168.1.1";
      for (let i = 0; i < 9; i++) {
        service.recordFailure(ip);
      }
      expect(service.isFlagged(ip)).toBe(false);
    });

    it("should flag IP after reaching threshold", () => {
      const ip = "192.168.1.1";
      for (let i = 0; i < 10; i++) {
        service.recordFailure(ip);
      }
      expect(service.isFlagged(ip)).toBe(true);
    });

    it("should flag at exactly the threshold", () => {
      const ip = "192.168.1.1";
      for (let i = 0; i < 9; i++) {
        service.recordFailure(ip);
        expect(service.isFlagged(ip)).toBe(false);
      }
      service.recordFailure(ip);
      expect(service.isFlagged(ip)).toBe(true);
    });
  });

  describe("TTL-based cleanup", () => {
    it("should not flag IP after TTL expires", () => {
      // Use a very short TTL
      service = new IpReputationService(2, 1); // threshold 2, TTL 1ms

      const ip = "192.168.1.1";
      service.recordFailure(ip);
      service.recordFailure(ip);
      expect(service.isFlagged(ip)).toBe(true);

      jest.useFakeTimers();
      jest.advanceTimersByTime(10);
      expect(service.isFlagged(ip)).toBe(false);
      jest.useRealTimers();
    });

    it("should return 0 failure count after TTL expires", () => {
      service = new IpReputationService(2, 1); // threshold 2, TTL 1ms

      const ip = "192.168.1.1";
      service.recordFailure(ip);
      service.recordFailure(ip);
      expect(service.getFailureCount(ip)).toBe(2);

      jest.useFakeTimers();
      jest.advanceTimersByTime(10);
      expect(service.getFailureCount(ip)).toBe(0);
      jest.useRealTimers();
    });

    it("should remove stale entries on cleanup()", () => {
      service = new IpReputationService(2, 1); // threshold 2, TTL 1ms

      service.recordFailure("1.1.1.1");
      service.recordFailure("2.2.2.2");

      jest.useFakeTimers();
      jest.advanceTimersByTime(10);

      // Add a fresh entry
      service.recordFailure("3.3.3.3");

      service.cleanup();

      expect(service.getFailureCount("1.1.1.1")).toBe(0);
      expect(service.getFailureCount("2.2.2.2")).toBe(0);
      expect(service.getFailureCount("3.3.3.3")).toBe(1);

      jest.useRealTimers();
    });
  });

  describe("isolation between IPs", () => {
    it("should track failures independently per IP", () => {
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";

      for (let i = 0; i < 10; i++) {
        service.recordFailure(ip1);
      }

      expect(service.isFlagged(ip1)).toBe(true);
      expect(service.isFlagged(ip2)).toBe(false);
      expect(service.getFailureCount(ip2)).toBe(0);
    });
  });
});
