const { gunzipSync, gzipSync } = require("zlib");

const UPLOAD_KINDS = [
  "target",
  "current",
  "lastMonth",
  "lastYear",
  "categoryMaster",
];

const KIND_TABLE = {
  target: "upload_target",
  current: "upload_current",
  lastMonth: "upload_last_month",
  lastYear: "upload_last_year",
  categoryMaster: "upload_category_master",
};

const CHUNK_ROW_LIMIT = 1500;

const getTursoConfig = () => {
  const rawUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.LIBSQL_URL ||
    process.env.DATABASE_URL;
  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN ||
    process.env.TURSO_TOKEN;

  if (!rawUrl || !authToken) {
    throw new Error(
      "Missing Turso credentials. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on Vercel.",
    );
  }

  const httpUrl = rawUrl.replace(/^libsql:/, "https:");
  return { httpUrl, authToken };
};

const compressJson = (value) => {
  const json = JSON.stringify(value);
  return gzipSync(Buffer.from(json, "utf8")).toString("base64");
};

const decompressJson = (encoded) => {
  const buffer = gunzipSync(Buffer.from(encoded, "base64"));
  return JSON.parse(buffer.toString("utf8"));
};

const tryParseRows = (encoded) => {
  if (!encoded) return [];
  try {
    const decompressed = decompressJson(encoded);
    return Array.isArray(decompressed) ? decompressed : [];
  } catch {
    try {
      const parsed = JSON.parse(encoded);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
};

const cellValue = (cell) => {
  if (cell == null) return null;
  if (typeof cell === "object" && "value" in cell) return cell.value;
  return cell;
};

const rowValues = (row) => {
  if (!Array.isArray(row)) return [];
  return row.map(cellValue);
};

const getExecuteResult = (payload, index = 0) => {
  const item = payload?.results?.[index];
  if (!item) return {};

  if (item.type === "error") {
    throw new Error(item.error?.message || "Turso query failed.");
  }

  if (item.type === "ok" && item.response?.type === "execute") {
    return item.response.result ?? {};
  }

  if (item.type === "execute") {
    return item.result ?? {};
  }

  return {};
};

const tursoPipeline = async (requests) => {
  const { httpUrl, authToken } = getTursoConfig();
  const response = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      baton: null,
      requests: [...requests, { type: "close" }],
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Turso HTTP ${response.status}`;
    throw new Error(message);
  }

  if (Array.isArray(payload?.results)) {
    for (const result of payload.results) {
      if (result?.type === "error") {
        throw new Error(result.error?.message || "Turso query failed.");
      }
    }
  }

  return payload;
};

const tursoExecute = async (sql, args = []) => {
  const stmt = { sql };
  if (args.length) {
    stmt.args = args.map((value) => {
      if (typeof value === "number" && Number.isInteger(value)) {
        return { type: "integer", value: String(value) };
      }
      return { type: "text", value: String(value) };
    });
  }

  const payload = await tursoPipeline([{ type: "execute", stmt }]);
  return getExecuteResult(payload, 0);
};

const listTables = async () => {
  const result = await tursoExecute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return (result.rows ?? []).map((row) => rowValues(row)[0]).filter(Boolean);
};

const ensureSchema = async () => {
  const requests = [];
  for (const kind of UPLOAD_KINDS) {
    const legacy = KIND_TABLE[kind];
    const chunks = `${legacy}_chunks`;

    requests.push({
      type: "execute",
      stmt: {
        sql: `CREATE TABLE IF NOT EXISTS ${legacy} (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          file_name TEXT NOT NULL,
          rows_json TEXT NOT NULL,
          row_count INTEGER NOT NULL,
          uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
      },
    });

    requests.push({
      type: "execute",
      stmt: {
        sql: `CREATE TABLE IF NOT EXISTS ${chunks} (
          chunk_index INTEGER PRIMARY KEY,
          rows_json TEXT NOT NULL,
          row_count INTEGER NOT NULL,
          uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
      },
    });
  }

  const payload = await tursoPipeline(requests);
  for (let i = 0; i < requests.length; i += 1) {
    getExecuteResult(payload, i);
  }
};

const chunkTable = (kind) => `${KIND_TABLE[kind]}_chunks`;

const splitRows = (rows) => {
  const chunks = [];
  for (let i = 0; i < rows.length; i += CHUNK_ROW_LIMIT) {
    chunks.push(rows.slice(i, i + CHUNK_ROW_LIMIT));
  }
  return chunks;
};

const loadUploadKind = async (kind) => {
  await ensureSchema();
  const table = chunkTable(kind);
  const result = await tursoExecute(
    `SELECT rows_json FROM ${table} ORDER BY chunk_index ASC`,
  );

  const entries = result.rows ?? [];
  if (!entries.length) {
    const legacy = await tursoExecute(
      `SELECT rows_json FROM ${KIND_TABLE[kind]} WHERE id = 1`,
    );
    const legacyRows = legacy.rows ?? [];
    if (!legacyRows.length) return [];

    const encoded = rowValues(legacyRows[0])[0];
    const rows = tryParseRows(encoded);
    if (rows.length) await saveUploadKind(kind, rows);
    return rows;
  }

  const rows = [];
  for (const entry of entries) {
    rows.push(...tryParseRows(rowValues(entry)[0]));
  }
  return rows;
};

const saveUploadKind = async (kind, rows) => {
  await ensureSchema();
  const table = chunkTable(kind);
  const chunks = splitRows(rows);
  const requests = [
    { type: "execute", stmt: { sql: `DELETE FROM ${table}` } },
    { type: "execute", stmt: { sql: `DELETE FROM ${KIND_TABLE[kind]}` } },
  ];

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex];
    requests.push({
      type: "execute",
      stmt: {
        sql: `INSERT INTO ${table} (chunk_index, rows_json, row_count) VALUES (?, ?, ?)`,
        args: [
          { type: "integer", value: String(chunkIndex) },
          { type: "text", value: compressJson(chunk) },
          { type: "integer", value: String(chunk.length) },
        ],
      },
    });
  }

  const payload = await tursoPipeline(requests);
  for (let i = 0; i < requests.length; i += 1) {
    getExecuteResult(payload, i);
  }
};

const saveUploadKindChunk = async (kind, chunkIndex, chunkCount, rows) => {
  await ensureSchema();
  const table = chunkTable(kind);
  const requests = [];

  if (chunkIndex === 0) {
    requests.push({ type: "execute", stmt: { sql: `DELETE FROM ${table}` } });
  }

  requests.push({
    type: "execute",
    stmt: {
      sql: `INSERT INTO ${table} (chunk_index, rows_json, row_count) VALUES (?, ?, ?)`,
      args: [
        { type: "integer", value: String(chunkIndex) },
        { type: "text", value: compressJson(rows) },
        { type: "integer", value: String(rows.length) },
      ],
    },
  });

  if (chunkIndex === chunkCount - 1) {
    requests.push({
      type: "execute",
      stmt: { sql: `DELETE FROM ${KIND_TABLE[kind]}` },
    });
  }

  const payload = await tursoPipeline(requests);
  for (let i = 0; i < requests.length; i += 1) {
    getExecuteResult(payload, i);
  }
};

const clearUploadKind = async (kind) => {
  await ensureSchema();
  await tursoPipeline([
    { type: "execute", stmt: { sql: `DELETE FROM ${chunkTable(kind)}` } },
    { type: "execute", stmt: { sql: `DELETE FROM ${KIND_TABLE[kind]}` } },
  ]);
};

const isUploadKind = (value) => UPLOAD_KINDS.includes(value);

module.exports = {
  UPLOAD_KINDS,
  clearUploadKind,
  decompressJson,
  getTursoConfig,
  isUploadKind,
  listTables,
  loadUploadKind,
  saveUploadKind,
  saveUploadKindChunk,
};
