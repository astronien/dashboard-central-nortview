import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearSession,
  createSessionToken,
  decodeSessionToken,
  readSession,
  writeSession,
} from "./session";

describe("session token", () => {
  it("createSessionToken produces a non-empty base64 string", () => {
    const token = createSessionToken({
      userId: 1,
      username: "admin",
      role: "admin",
      name: "Admin",
    });
    assert.equal(typeof token, "string");
    assert.ok(token.length > 0);
    // base64 should round-trip without throwing
    Buffer.from(token, "base64");
  });

  it("decodeSessionToken returns payload for valid token", () => {
    const token = createSessionToken({
      userId: 42,
      username: "25293",
      role: "pia",
      name: "Test User",
    });
    const payload = decodeSessionToken(token);
    assert.ok(payload);
    assert.equal(payload.userId, 42);
    assert.equal(payload.username, "25293");
    assert.equal(payload.role, "pia");
    assert.equal(payload.name, "Test User");
    assert.ok(payload.exp > Date.now());
  });

  it("decodeSessionToken returns null for invalid base64", () => {
    assert.equal(decodeSessionToken("not-valid-base64-!!!"), null);
  });

  it("decodeSessionToken returns null for expired token", () => {
    // Manually craft an expired token
    const expired = Buffer.from(
      JSON.stringify({
        userId: 1,
        username: "admin",
        role: "admin",
        name: "Admin",
        exp: Date.now() - 1000,
      }),
    ).toString("base64");
    assert.equal(decodeSessionToken(expired), null);
  });

  it("writeSession + readSession round-trip in browser env", () => {
    if (typeof window === "undefined") {
      // skip in node test
      return;
    }
    const token = createSessionToken({
      userId: 1,
      username: "test",
      role: "admin",
      name: "Test",
    });
    writeSession(token);
    const payload = readSession();
    assert.ok(payload);
    assert.equal(payload.username, "test");
    clearSession();
    assert.equal(readSession(), null);
  });

  it("round-trips Thai / non-Latin1 names without throwing", () => {
    // Regression: plain btoa() throws on non-ASCII — make sure UTF-8
    // encoding handles Thai names, emoji, etc.
    const cases = [
      { name: "ฟารีดา มะโนรัตน์", username: "25293" },
      { name: "Branch Sales Manager", username: "admin" },
      { name: "สวัสดี 🚀", username: "tester" },
      { name: "テスト", username: "jp" },
    ];
    for (const c of cases) {
      const token = createSessionToken({
        userId: 1,
        username: c.username,
        role: "pia",
        name: c.name,
      });
      const payload = decodeSessionToken(token);
      assert.ok(payload, `decode failed for name: ${c.name}`);
      assert.equal(payload.name, c.name);
      assert.equal(payload.username, c.username);
    }
  });
});
