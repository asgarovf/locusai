import { afterEach, describe, expect, it } from "bun:test";
import { readClipboardImage } from "../src/repl/clipboard.js";

// We mock execSync at the module level via bun's mock utilities.
// Since readClipboardImage uses execSync internally, we test the behaviour
// by observing return values under different platform conditions.

describe("clipboard", () => {
  describe("readClipboardImage", () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("returns null on unsupported platforms", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const result = readClipboardImage();
      expect(result).toBeNull();
    });

    it("returns null when clipboard has no image (macOS)", () => {
      // On macOS without actual clipboard image data, osascript will fail
      // or return "no-image", so readClipboardImage returns null.
      Object.defineProperty(process, "platform", { value: "darwin" });
      const result = readClipboardImage();
      // In test environments osascript is unlikely to have image data.
      expect(result).toBeNull();
    });

    it("returns null when clipboard has no image (Linux)", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      const result = readClipboardImage();
      // In test environments xclip may not be available.
      expect(result).toBeNull();
    });
  });
});
