require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;

async function main() {
  try {
    const rows = await loadUploadKind("target");
    console.log("Total target rows loaded:", rows.length);

    let sumTotal = 0;
    let sumIphone = 0;
    let sumMac = 0;
    let sumIpad = 0;
    let sumWatch = 0;
    let sumSim = 0;
    let sumBtb = 0;
    let sumSmartphone = 0;

    rows.forEach(row => {
      sumTotal += toNumber(row.Total ?? row.total_target);
      sumIphone += toNumber(row.iPhone ?? row.iphone);
      sumMac += toNumber(row.Mac ?? row.mac);
      sumIpad += toNumber(row.iPad ?? row.ipad);
      sumWatch += toNumber(row["Apple Watch"] ?? row.apple_watch);
      sumSim += toNumber(row.SIM ?? row.sim);
      sumBtb += toNumber(row.BTB ?? row.btb);
      sumSmartphone += toNumber(row.Smartphone ?? row.smartphone);
    });

    console.log("\nTargets sums:");
    console.log("Total:", sumTotal);
    console.log("iPhone:", sumIphone);
    console.log("Mac:", sumMac);
    console.log("iPad:", sumIpad);
    console.log("Apple Watch:", sumWatch);
    console.log("SIM:", sumSim);
    console.log("BTB:", sumBtb);
    console.log("Smartphone:", sumSmartphone);
    console.log("Sum of categories targets:", sumIphone + sumMac + sumIpad + sumWatch + sumSim + sumBtb + sumSmartphone);

  } catch (err) {
    console.error(err);
  }
}

main();
