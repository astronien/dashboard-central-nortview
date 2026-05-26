import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcAchievementPct,
  calcForecast,
  calcForecastByDays,
  getTargetForPeriod,
  rawTargetRowsToRecords,
  type TargetRecord,
} from "./targetAggregations";

const sampleTargets: TargetRecord[] = [
  {
    month: 202605,
    year: 2026,
    monthNum: 5,
    branchId: "B1",
    officerId: "O1",
    officerName: "A B",
    totalTarget: 100,
    iPhoneTarget: 50,
    iPadTarget: 0,
    macTarget: 0,
    watchTarget: 0,
    simTarget: 10,
    btbTarget: 20,
    btbAppleTarget: 5,
  },
  {
    month: 202606,
    year: 2026,
    monthNum: 6,
    branchId: "B1",
    officerId: "O1",
    officerName: "A B",
    totalTarget: 200,
    iPhoneTarget: 80,
    iPadTarget: 0,
    macTarget: 0,
    watchTarget: 0,
    simTarget: 15,
    btbTarget: 30,
    btbAppleTarget: 10,
  },
];

describe("targetAggregations", () => {
  it("sums targets across months in period", () => {
    const total = getTargetForPeriod(
      sampleTargets,
      "O1",
      "officer",
      "2026-05-01",
      "2026-06-30",
    );
    assert.equal(total, 300);
  });

  it("returns 0 achievement when target is 0", () => {
    assert.equal(calcAchievementPct(500, 0), 0);
    assert.equal(calcAchievementPct(0, 0), 0);
  });

  it("calcForecastByDays scales actual by period length", () => {
    assert.equal(calcForecastByDays(1000, 10, 31), 3100);
    assert.equal(calcForecastByDays(1000, 0, 31), 0);
  });

  it("calcForecast returns 0 before period starts", () => {
    const fc = calcForecast(10000, "2026-12-01", "2026-12-31", new Date("2026-11-15"));
    assert.equal(fc, 0);
  });

  it("calcForecast returns actual when period ended", () => {
    const fc = calcForecast(9000, "2026-01-01", "2026-01-31", new Date("2026-02-10"));
    assert.equal(fc, 9000);
  });

  it("calcForecast returns 0 when fewer than 3 days elapsed", () => {
    const fc = calcForecast(5000, "2026-05-01", "2026-05-31", new Date("2026-05-02"));
    assert.equal(fc, 0);
  });

  it("rawTargetRowsToRecords parses upload rows", () => {
    const records = rawTargetRowsToRecords([
      {
        month: "202605",
        emp_shop_code: "B9",
        emp_id: "123",
        NAME: "Test",
        SURNAME: "User",
        Total: "1,000",
        iPhone: "400",
        Mac: "0",
        iPad: "0",
        SIM: "5",
        BTB: "100",
        "BTB(Apple)": "25",
      },
    ]);
    assert.equal(records.length, 1);
    assert.equal(records[0].totalTarget, 1000);
    assert.equal(records[0].iPhoneTarget, 400);
    assert.equal(records[0].simTarget, 5);
    assert.equal(records[0].btbAppleTarget, 25);
  });
});
