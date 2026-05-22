require("dotenv").config({ path: "/Users/astronien/Desktop/dashboard new version/.env" });
const { loadUploadKind } = require("../api/turso");

const toNumber = (value) => Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
const normalizeText = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9ก-๙ ]/gi, "").trim();

const getCategoryValue = (row) => {
  const category = normalizeText(row["Category (Name)"] ?? row.category ?? row.cat ?? row["Cat & Sub Cat"]);
  return category.includes("sim") ? toNumber(row.Number ?? row.number ?? row.qty) : toNumber(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice);
};

const getSalesDate = (row) => {
  const raw = String(row["Doc Date"] ?? row["doc date"] ?? "");
  const parsed = Date.parse(raw.replace(/^\S+\.\s*/, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRowKey = (row) => {
  return [
    String(row["Doc No"] ?? "").trim(),
    String(row["Product (Name)"] ?? "").replace(/\s+/g, " ").trim(),
    String(row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice ?? "").trim(),
    String(row["Serial"] ?? "").trim(),
    String(row["Doc Date"] ?? "").trim()
  ].join("||");
};

const CHOSEN_DUPLICATE_KEYS = new Set([
  "528,011||Blue Box Casing for iPhone 16 (6.1) Winnie & Friends with Magsafe||250.00||null||อ. 19/05/2026 14:18:12",
  "528,014||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.97E+17||อ. 19/05/2026 14:26:08",
  "528,021||AMAZINGthing USB-A to USB-C Cable 66W Thunder Pro I 7X 1.2M Black||490.00||NULL||อ. 19/05/2026 15:25:32",
  "528,044||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.96604E+17||อ. 19/05/2026 17:28:33",
  "528,056||Apple Acc 20W USB-C Power Adapter (New)||790.00||NULL||อ. 19/05/2026 17:54:06",
  "528,068||Blue Box Casing for iPhone 17Air (6.5) bellygom and friends||390.00||NULL||อ. 19/05/2026 18:47:09",
  "528,071||AppleCare+ for iPad Pro 11-inch (M5)||4,490.00||3.28056E+11||อ. 19/05/2026 19:11:51",
  "528,073||Apple Acc 20W USB-C Power Adapter (New)||790.00||NULL||อ. 19/05/2026 19:24:14",
  "528,075||AMAZINGthing Camera Lens for iPhone 13 (6.1 inch) 3D Len Glass (Two Lens) Crystal||390.00||NULL||อ. 19/05/2026 19:41:18",
  "528,083||The Pixel Tempered Glass Film for Apple iPhone 17Pro Max (6.9) Black||890.00||NULL||อ. 19/05/2026 20:38:43",
  "528,094||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.97E+17||พ. 20/05/2026 12:34:48",
  "528,099||Apple Watch SE 3 GPS 44mm Midnight Aluminium Case with Midnight Sport Band - M/L||9,300.00||SJQ9RMVT2FK||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 44mm Midnight Aluminium Case with Midnight Sport Band - M/L||9,300.00||SL09FC73VYL||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 44mm Midnight Aluminium Case with Midnight Sport Band - M/L||9,300.00||SMVN6TKV7F0||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SG3PVJWRL9C||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SG16Y64GR4M||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SJP6T2P5W0W||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SJ9X0772K2C||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SJGV9YPM7P9||พ. 20/05/2026 13:30:02",
  "528,099||Apple Watch SE 3 GPS 40mm Starlight Aluminium Case with Starlight Sport Band - S/M||8,300.00||SLJ0H9176VQ||พ. 20/05/2026 13:30:02",
  "528,103||JTLEGEND Casing for iPhone 17Pro Max (6.9) Glitter Hybrid Cushion Mag (Camera Control Button) Crystal Clear with Orange Magnetic||690.00||NULL||พ. 20/05/2026 14:01:41",
  "528,107||AMAZINGthing Camera Lens for iPhone 17Pro/17Pro Max 3D Len Glass (Three Lens) Titanium||690.00||NULL||พ. 20/05/2026 14:42:06",
  "528,107||AMAZINGthing Casing for iPhone 17Pro Max (6.9) Minimal Magsafe Drop proof Titan Orange||690.00||NULL||พ. 20/05/2026 14:42:06",
  "528,119||Apple Acc AirTag 2nd Generation (1 Pack)||990.00||SGK445RF2RK||พ. 20/05/2026 15:51:26",
  "528,120||AMAZINGthing Camera Lens for iPhone 17Pro/17Pro Max 3D Len Glass (Three Lens) Titan Blue||690.00||NULL||พ. 20/05/2026 15:57:42",
  "528,129||Apple Acc 20W USB-C Power Adapter (New)||790.00||NULL||พ. 20/05/2026 17:14:59",
  "528,134||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.97E+17||พ. 20/05/2026 17:48:23",
  "528,134||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.96604E+17||พ. 20/05/2026 17:48:23",
  "528,135||SIM,STD,TMH2 MULTI NON SHOP FREE||0.00||8.96604E+17||พ. 20/05/2026 18:00:49",
  "528,148||Apple Watch SE 3 GPS 44mm Starlight Aluminium Case with Starlight Sport Band - S/M||9,300.00||SKJ7M34RMFQ||พ. 20/05/2026 19:02:49",
  "528,160||JTLEGEND Casing for iPhone 17Pro Max (6.9) Glitter Hybrid Cushion Mag (Camera Control Button) Crystal Clear with Orange Magnetic||690.00||NULL||พ. 20/05/2026 19:54:33"
]);

async function main() {
  try {
    const rows = await loadUploadKind("current");
    const seen = new Set();
    const verifyRows = [];

    [...rows].sort((a, b) => getSalesDate(b) - getSalesDate(a)).forEach(row => {
      const dupKey = `${row["Doc No"]}_${row["Product (Code)"] ?? row.product_code ?? ""}_${row["ราคาขายตามบิล"] ?? row["Total Price"] ?? row.totalPrice}`;
      const rowKey = getRowKey(row);

      if (seen.has(dupKey) && !CHOSEN_DUPLICATE_KEYS.has(rowKey)) {
        return;
      }
      seen.add(dupKey);
      verifyRows.push(row);
    });

    let verifySum = 0;
    verifyRows.forEach(r => verifySum += getCategoryValue(r));
    console.log("Verify Sum with Descending Sort de-duplication:", verifySum);
    console.log("Perfect Match?", Math.abs(verifySum - 51767335.23) < 0.01);

  } catch (err) {
    console.error(err);
  }
}

main();
