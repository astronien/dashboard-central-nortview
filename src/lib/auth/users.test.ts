import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateSalt,
  hashPassword,
  PASSWORD_SALT_BYTES,
  verifyPassword,
} from "./users";

describe("password hashing", () => {
  it("generateSalt returns hex string of expected length", () => {
    const salt = generateSalt();
    assert.equal(typeof salt, "string");
    assert.equal(salt.length, PASSWORD_SALT_BYTES * 2);
    assert.match(salt, /^[0-9a-f]+$/);
  });

  it("generateSalt produces different values across calls", () => {
    const a = generateSalt();
    const b = generateSalt();
    assert.notEqual(a, b);
  });

  it("hashPassword returns 64-char hex string", async () => {
    const h = await hashPassword("hello", "abcd");
    assert.equal(h.length, 64);
    assert.match(h, /^[0-9a-f]+$/);
  });

  it("hashPassword is deterministic for same input", async () => {
    const a = await hashPassword("hello", "abcd");
    const b = await hashPassword("hello", "abcd");
    assert.equal(a, b);
  });

  it("hashPassword differs across salts", async () => {
    const a = await hashPassword("hello", "salt1");
    const b = await hashPassword("hello", "salt2");
    assert.notEqual(a, b);
  });

  it("verifyPassword returns true for matching password", async () => {
    const salt = generateSalt();
    const hash = await hashPassword("secret", salt);
    assert.equal(await verifyPassword("secret", salt, hash), true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const salt = generateSalt();
    const hash = await hashPassword("secret", salt);
    assert.equal(await verifyPassword("wrong", salt, hash), false);
  });
});
