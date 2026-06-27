import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// Polyfill minimal DOM globals so the watcher module loads
(globalThis as any).fetch = async () => ({ ok: true, json: async () => ({ lastModified: null }) });
(globalThis as any).document = {
  hidden: false,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).window = { setTimeout: setTimeout, clearTimeout: clearTimeout };

// Use dynamic import after stubs are in place
const mod = await import("./uploadWatcher");
const startUploadWatcher = mod.startUploadWatcher;

describe("uploadWatcher — startUploadWatcher", () => {
  it("exists and is a function", () => {
    assert.equal(typeof startUploadWatcher, "function");
  });

  it("returns a stop function when started", () => {
    const stop = startUploadWatcher({
      intervalMs: 100_000,
      onUpdate: () => {},
    });
    assert.equal(typeof stop, "function");
    stop();
  });
});

