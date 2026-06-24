import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { migrateFromLocalStorage } from "./storage";

/**
 * Polyfill a minimal localStorage in node for testing.
 */
function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  globalThis.window = { localStorage: ls } as unknown as typeof globalThis.window;
  return ls;
}

beforeEach(() => {
  delete (globalThis as { window?: unknown }).window;
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("migrateFromLocalStorage", () => {
  it("returns false when no value is stored", async () => {
    installLocalStorage({});
    const result = await migrateFromLocalStorage("missing-key");
    assert.equal(result, false);
  });

  it("does NOT throw on plain string value (e.g. branch label like 'ID645 : Studio 7')", async () => {
    // Regression: previously this would throw "Unexpected token 'I'" because
    // the value isn't valid JSON. Now it should treat the string as raw.
    installLocalStorage({ "dashboard-selected-branch": "ID645 : Studio 7" });
    let threw: unknown = null;
    try {
      await migrateFromLocalStorage("dashboard-selected-branch");
    } catch (e) {
      threw = e;
    }
    assert.equal(threw, null, "should not throw on plain string value");
  });

  it("does NOT throw on JSON object value", async () => {
    installLocalStorage({ "my-key": '{"a":1,"b":"two"}' });
    let threw: unknown = null;
    try {
      await migrateFromLocalStorage("my-key");
    } catch (e) {
      threw = e;
    }
    assert.equal(threw, null);
  });

  it("does NOT throw on empty string", async () => {
    installLocalStorage({ "empty-key": "" });
    const result = await migrateFromLocalStorage("empty-key");
    assert.equal(result, false);
  });

  it("does NOT throw on number string", async () => {
    installLocalStorage({ "num-key": "42" });
    let threw: unknown = null;
    try {
      await migrateFromLocalStorage("num-key");
    } catch (e) {
      threw = e;
    }
    assert.equal(threw, null);
  });
});
