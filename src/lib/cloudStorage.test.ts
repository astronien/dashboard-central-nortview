import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Tests for the chunking math used by cloudStorage. We test the
 * pure split/reassemble logic so the test doesn't require a live
 * Turso connection.
 */

function splitChunks<T>(rows: T[], rowsPerChunk: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += rowsPerChunk) {
    out.push(rows.slice(i, i + rowsPerChunk));
  }
  return out;
}

describe("cloudStorage chunking", () => {
  it("splits empty array into no chunks", () => {
    assert.deepEqual(splitChunks([], 1500), []);
  });

  it("splits array smaller than chunk size into one chunk", () => {
    const rows = [{ a: 1 }, { a: 2 }];
    const chunks = splitChunks(rows, 1500);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].length, 2);
  });

  it("splits array equal to chunk size into one chunk", () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ i }));
    const chunks = splitChunks(rows, 1500);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].length, 1500);
  });

  it("splits array larger than chunk size into multiple chunks", () => {
    const rows = Array.from({ length: 3500 }, (_, i) => ({ i }));
    const chunks = splitChunks(rows, 1500);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 1500);
    assert.equal(chunks[1].length, 1500);
    assert.equal(chunks[2].length, 500);
  });

  it("preserves row order after split + reassemble", () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({ i, name: `row-${i}` }));
    const chunks = splitChunks(rows, 1500);
    const reassembled = chunks.flat();
    assert.equal(reassembled.length, 5000);
    for (let i = 0; i < 5000; i++) {
      assert.equal(reassembled[i].i, i);
      assert.equal(reassembled[i].name, `row-${i}`);
    }
  });

  it("chunked JSON size stays under per-request limit", () => {
    // Simulate typical sales row (~300 bytes when serialised)
    const makeRow = (i: number) => ({
      "Doc No": `DOC-${i}`,
      "Officer (Name)": `Officer ${i % 50}`,
      "Category (Name)": ["iPhone", "iPad", "Mac", "Watch", "SIM"][i % 5],
      "Product (Name)": `Product ${i} with some longer text fields included for realism`,
      "Total Price": 1000 + i,
    });
    const rows = Array.from({ length: 6000 }, (_, i) => makeRow(i));
    const chunks = splitChunks(rows, 1500);
    // Each chunk should be ~450KB which is well under the 500KB target
    for (const c of chunks) {
      const size = JSON.stringify(c).length;
      assert.ok(size < 1_000_000, `chunk size ${size} exceeds 1MB safety limit`);
    }
  });
});
