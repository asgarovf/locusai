import "reflect-metadata";
import "../../../test-setup";

import { randomBytes } from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { TypedConfigService } from "@/config/config.service";
import { EncryptionService } from "../encryption.service";

describe("EncryptionService", () => {
  const TEST_KEY = randomBytes(32).toString("hex");

  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: TypedConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(TEST_KEY),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it("should encrypt and decrypt a string (roundtrip)", () => {
    const plaintext = "my-secret-access-key-12345";
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertexts for different plaintexts", () => {
    const encrypted1 = service.encrypt("plaintext-one");
    const encrypted2 = service.encrypt("plaintext-two");

    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should produce different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "same-value";
    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);

    // Both should still decrypt to the same value
    expect(service.decrypt(encrypted1)).toBe(plaintext);
    expect(service.decrypt(encrypted2)).toBe(plaintext);
  });

  it("should output format iv:authTag:ciphertext (hex values)", () => {
    const encrypted = service.encrypt("test-data");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);

    const [iv, authTag, ciphertext] = parts;
    // IV is 12 bytes = 24 hex chars
    expect(iv).toMatch(/^[0-9a-f]{24}$/);
    // Auth tag is 16 bytes = 32 hex chars
    expect(authTag).toMatch(/^[0-9a-f]{32}$/);
    // Ciphertext is hex encoded
    expect(ciphertext).toMatch(/^[0-9a-f]+$/);
  });

  it("should fail to decrypt with a wrong key", async () => {
    const encrypted = service.encrypt("secret-data");

    // Create a new service with a different key
    const differentKey = randomBytes(32).toString("hex");
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: TypedConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(differentKey),
          },
        },
      ],
    }).compile();

    const wrongKeyService = module.get<EncryptionService>(EncryptionService);

    expect(() => wrongKeyService.decrypt(encrypted)).toThrow();
  });

  it("should throw when ENCRYPTION_KEY is not configured", async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: TypedConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    const noKeyService = module.get<EncryptionService>(EncryptionService);

    expect(() => noKeyService.encrypt("test")).toThrow(
      "ENCRYPTION_KEY is not configured"
    );
    expect(() => noKeyService.decrypt("aabbcc:ddeeff:112233")).toThrow(
      "ENCRYPTION_KEY is not configured"
    );
  });

  it("should handle empty string encryption", () => {
    const encrypted = service.encrypt("");
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("should handle unicode strings", () => {
    const plaintext =
      "Hello, World! \u{1F680}\u{1F30D} \u00E9\u00E0\u00FC\u00F1";
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
