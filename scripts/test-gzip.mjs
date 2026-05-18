import { gzipSync, gunzipSync } from "zlib";

const rows = [{ branch: "Test", price: 99 }];
const json = JSON.stringify(rows);
const b64 = gzipSync(Buffer.from(json, "utf8")).toString("base64");

const out = JSON.parse(gunzipSync(Buffer.from(b64, "base64")).toString("utf8"));
console.log("roundtrip ok", out.length, b64.slice(0, 40));
