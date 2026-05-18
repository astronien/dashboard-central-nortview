import { gunzipSync, gzipSync } from "node:zlib";

export const compressJson = (value: unknown): string => {
  const json = JSON.stringify(value);
  return gzipSync(Buffer.from(json, "utf8")).toString("base64");
};

export const decompressJson = <T>(encoded: string): T => {
  const buffer = gunzipSync(Buffer.from(encoded, "base64"));
  return JSON.parse(buffer.toString("utf8")) as T;
};
