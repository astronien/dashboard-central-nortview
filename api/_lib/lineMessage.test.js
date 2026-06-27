/**
 * Tests for LINE Flex Message builders.
 *
 * Verifies that:
 *   - buildReplyMessage returns exactly 2 messages (text + flex)
 *   - buildErrorFlex returns a valid Flex bubble
 *   - The Flex contents array is FLAT (no nested arrays) — LINE API rejects nested arrays
 */

import { describe, it } from "node:test";
import { buildReplyMessage, buildErrorFlex } from "./lineMessage.js";

function isFlatContents(obj) {
  if (!obj || typeof obj !== "object") return true;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (Array.isArray(item)) return false;
    }
    return obj.every(isFlatContents);
  }
  if (obj.contents) {
    if (Array.isArray(obj.contents) && obj.contents.some((c) => Array.isArray(c))) {
      return false;
    }
    return isFlatContents(obj.contents);
  }
  return true;
}

function findNestedArrays(obj) {
  const found = [];
  function walk(o, path) {
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) {
        if (Array.isArray(o[i])) {
          found.push(`${path}[${i}]`);
        } else {
          walk(o[i], `${path}[${i}]`);
        }
      }
    } else if (o && typeof o === "object") {
      for (const [k, v] of Object.entries(o)) {
        walk(v, `${path}.${k}`);
      }
    }
  }
  walk(obj, "$");
  return found;
}

describe("lineMessage — Flex Message validation", () => {
  it("buildReplyMessage returns text + flex", () => {
    const msgs = buildReplyMessage({
      fileName: "test.xlsx",
      rows: 1000,
      branchId: "645",
      targetTotal: 2500000,
      actualTotal: 2800000,
      achPct: 112,
      topOfficers: [
        { name: "สมชาย", amount: 500000 },
        { name: "สมหญิง", amount: 300000 },
      ],
    });
    if (!Array.isArray(msgs)) throw new Error("expected array");
    if (msgs.length !== 2) throw new Error(`expected 2 messages, got ${msgs.length}`);
    if (msgs[0].type !== "text") throw new Error("first msg should be text");
    if (msgs[1].type !== "flex") throw new Error("second msg should be flex");
  });

  it("buildReplyMessage has flat contents (LINE spec compliance)", () => {
    const msgs = buildReplyMessage({
      fileName: "test.xlsx",
      rows: 1000,
      branchId: "645",
      targetTotal: 2500000,
      actualTotal: 2800000,
      achPct: 112,
      topOfficers: [
        { name: "สมชาย", amount: 500000 },
        { name: "สมหญิง", amount: 300000 },
      ],
    });
    const flex = msgs[1].contents;
    const nested = findNestedArrays(flex);
    if (nested.length > 0) {
      throw new Error(`Flex contents has nested arrays at: ${nested.join(", ")}`);
    }
    if (!isFlatContents(flex)) {
      throw new Error("Flex contents is not flat");
    }
  });

  it("buildReplyMessage works without topOfficers", () => {
    const msgs = buildReplyMessage({
      fileName: "target.xlsx",
      rows: 50,
      branchId: "645",
      targetTotal: 0,
      actualTotal: 0,
      achPct: 0,
      topOfficers: [],
    });
    const flex = msgs[1].contents;
    const nested = findNestedArrays(flex);
    if (nested.length > 0) {
      throw new Error(`Flex contents has nested arrays at: ${nested.join(", ")}`);
    }
  });

  it("buildErrorFlex returns valid bubble", () => {
    const flex = buildErrorFlex("test error");
    if (flex.type !== "flex") throw new Error("expected flex type");
    if (flex.contents.type !== "bubble") throw new Error("expected bubble");
    const nested = findNestedArrays(flex.contents);
    if (nested.length > 0) {
      throw new Error(`Flex contents has nested arrays at: ${nested.join(", ")}`);
    }
  });

  it("Flex with topOfficers includes all officer names", () => {
    const msgs = buildReplyMessage({
      fileName: "test.xlsx",
      rows: 100,
      branchId: "645",
      targetTotal: 1000000,
      actualTotal: 1500000,
      achPct: 150,
      topOfficers: [
        { name: "ALPHA", amount: 500000 },
        { name: "BETA", amount: 300000 },
        { name: "GAMMA", amount: 200000 },
      ],
    });
    const body = JSON.stringify(msgs[1]);
    if (!body.includes("ALPHA")) throw new Error("missing ALPHA");
    if (!body.includes("BETA")) throw new Error("missing BETA");
    if (!body.includes("GAMMA")) throw new Error("missing GAMMA");
    if (!body.includes("Top Officers")) throw new Error("missing Top Officers header");
  });
});
