import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { decryptSecret, encryptSecret, sha256Hex, timingSafeHexEqual } from "./crypto";

describe("secret storage", () => {
  const previous = process.env.NEXTAUTH_SECRET;

  before(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-that-is-long-enough";
  });

  after(() => {
    process.env.NEXTAUTH_SECRET = previous;
  });

  it("round-trips a bank token", () => {
    const encrypted = encryptSecret("access-sandbox-token");
    assert.equal(encrypted.startsWith("enc:v1:"), true);
    assert.equal(decryptSecret(encrypted), "access-sandbox-token");
    assert.notEqual(encryptSecret("access-sandbox-token"), encrypted);
  });

  it("rejects a tampered payload", () => {
    const encrypted = encryptSecret("access-sandbox-token");
    const parts = encrypted.split(":");
    parts[4] = parts[4].slice(0, -2) + (parts[4].endsWith("a") ? "b" : "a");
    assert.throws(() => decryptSecret(parts.join(":")));
  });

  it("compares webhook body hashes without matching different lengths", () => {
    const hash = sha256Hex("{\"item_id\":\"abc\"}");
    assert.equal(timingSafeHexEqual(hash, hash), true);
    assert.equal(timingSafeHexEqual(hash, hash.slice(0, -1)), false);
    assert.equal(timingSafeHexEqual(hash, "0".repeat(hash.length)), false);
  });
});