const { gunzipSync, gzipSync } = require("zlib");
const {
  appendRowsToTurso,
  clearRelationalKind,
  countRowsInTurso,
  ensureRelationalSchema,
  loadRowsFromTurso,
  saveRowsToTurso,
} = require("./tables-sync");

const UPLOAD_KINDS = [
  "target",
  "current",
  "today",
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

const isMissingTableError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return /no such table/i.test(message);
};

/** Legacy chunk/meta tables may not exist on newer DBs — treat as empty/no-op */
const tursoExecuteOptional = async (sql, args = []) => {
  try {
    return await tursoExecute(sql, args);
  } catch (error) {
    if (isMissingTableError(error)) return { rows: [] };
    throw error;
  }
};

const listTables = async () => {
  const result = await tursoExecute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return (result.rows ?? []).map((row) => rowValues(row)[0]).filter(Boolean);
};

const chunkTable = (kind) => `${KIND_TABLE[kind]}_chunks`;

const dbDeps = () => ({
  tursoExecute,
  tursoPipeline,
  getExecuteResult,
});

const loadLegacyChunks = async (kind) => {
  const table = chunkTable(kind);
  const result = await tursoExecuteOptional(
    `SELECT rows_json FROM ${table} ORDER BY chunk_index ASC`,
  );

  const entries = result.rows ?? [];
  if (!entries.length) return [];

  const rows = [];
  for (const entry of entries) {
    rows.push(...tryParseRows(rowValues(entry)[0]));
  }
  return rows;
};

const loadUploadKind = async (kind) => {
  const rows = await loadRowsFromTurso(kind, tursoExecute, rowValues);
  if (rows.length) return rows;

  const legacy = await loadLegacyChunks(kind);
  if (legacy.length) {
    await saveUploadKind(kind, legacy);
    return legacy;
  }

  return [];
};

const upsertUploadMeta = async (kind, rowCount) => {
  await tursoExecute(
    `INSERT INTO upload_meta (kind, row_count, chunk_count, updated_at)
     VALUES (?, ?, 0, datetime('now'))
     ON CONFLICT(kind) DO UPDATE SET
       row_count = excluded.row_count,
       chunk_count = 0,
       updated_at = excluded.updated_at`,
    [kind, rowCount],
  );
};

/** Upload → INSERT ตรงลงตาราง Turso (data_sales / data_targets / data_categories) */
const saveUploadKind = async (kind, rows) => {
  await saveRowsToTurso(kind, rows, dbDeps());
  await upsertUploadMeta(kind, rows.length);
};

const saveUploadKindChunk = async (kind, chunkIndex, chunkCount, rows) => {
  if (chunkIndex === 0) {
    await clearRelationalKind(kind, tursoExecute);
    await upsertUploadMeta(kind, 0);
  }

  await appendRowsToTurso(kind, rows, dbDeps());

  if (chunkIndex === chunkCount - 1) {
    const totalRows = await countRowsInTurso(kind, tursoExecute, rowValues);
    await upsertUploadMeta(kind, totalRows);
  }
};

const clearUploadKind = async (kind) => {
  await clearRelationalKind(kind, tursoExecute);
  await tursoExecuteOptional(`DELETE FROM ${chunkTable(kind)}`);
  await tursoExecuteOptional(`DELETE FROM ${KIND_TABLE[kind]}`);
  await upsertUploadMeta(kind, 0);
};

const clearAllUploads = async () => {
  await tursoExecute("DELETE FROM data_sales");
  await tursoExecute("DELETE FROM data_targets");
  await tursoExecute("DELETE FROM data_categories");
  await tursoExecute("DELETE FROM upload_meta");

  for (const kind of UPLOAD_KINDS) {
    await tursoExecuteOptional(`DELETE FROM ${chunkTable(kind)}`);
    await tursoExecuteOptional(`DELETE FROM ${KIND_TABLE[kind]}`);
  }

  const stats = {};
  for (const kind of UPLOAD_KINDS) {
    stats[kind] = 0;
  }
  return stats;
};

const syncAllRelationalTables = async () => {
  const summary = {};
  for (const kind of UPLOAD_KINDS) {
    const legacy = await loadLegacyChunks(kind);
    if (!legacy.length) {
      summary[kind] = await countRowsInTurso(kind, tursoExecute, rowValues);
      continue;
    }
    await saveUploadKind(kind, legacy);
    summary[kind] = legacy.length;
  }
  return summary;
};

const getUploadStats = async () => {
  const metaByKind = {};
  try {
    const metaResult = await tursoExecute(
      "SELECT kind, row_count, updated_at FROM upload_meta",
    );
    for (const row of metaResult.rows ?? []) {
      const [kind, rowCount, updatedAt] = rowValues(row);
      if (kind) {
        metaByKind[kind] = {
          rowCount: Number(rowCount) || 0,
          updatedAt: updatedAt ? String(updatedAt) : undefined,
        };
      }
    }
  } catch {
    // upload_meta may not exist on older DBs
  }

  const stats = {};
  for (const kind of UPLOAD_KINDS) {
    const rowCount = await countRowsInTurso(kind, tursoExecute, rowValues);
    const meta = metaByKind[kind];
    stats[kind] = {
      rowCount: rowCount || meta?.rowCount || 0,
      storage: "turso_tables",
      updatedAt: meta?.updatedAt,
    };
  }
  return stats;
};

const isUploadKind = (value) => UPLOAD_KINDS.includes(value);

const loadStaffPhotos = async (execute = tursoExecute) => {
  const result = await execute(
    `SELECT staff_id, officer_key, display_name, branch_name, photo_url, updated_at
     FROM staff_photos ORDER BY display_name ASC`,
  );
  return (result.rows ?? []).map((row) => {
    const [staffId, officerKey, displayName, branch, photoUrl, updatedAt] =
      rowValues(row);
    return {
      staffId: staffId ?? "",
      officerKey: officerKey ?? "",
      displayName: displayName ?? "",
      branch: branch ?? "",
      photoUrl: photoUrl ?? "",
      updatedAt: updatedAt ?? "",
    };
  });
};

const saveStaffPhoto = async (execute, record) => {
  await execute(
    `INSERT INTO staff_photos (staff_id, officer_key, display_name, branch_name, photo_url, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(staff_id) DO UPDATE SET
       officer_key = excluded.officer_key,
       display_name = excluded.display_name,
       branch_name = excluded.branch_name,
       photo_url = excluded.photo_url,
       updated_at = excluded.updated_at`,
    [
      record.staffId,
      record.officerKey,
      record.displayName,
      record.branch,
      record.photoUrl,
    ],
  );
};

const deleteStaffPhoto = async (execute, staffId) => {
  await execute("DELETE FROM staff_photos WHERE staff_id = ?", [staffId]);
};

const initDatabase = async () => {
  await ensureRelationalSchema(tursoExecute);
  const tables = await listTables();
  const { httpUrl } = getTursoConfig();
  let database = httpUrl;
  try {
    database = new URL(httpUrl).hostname;
  } catch {
    // keep raw url
  }
  return { database, tables };
};

module.exports = {
  UPLOAD_KINDS,
  clearAllUploads,
  clearUploadKind,
  decompressJson,
  deleteStaffPhoto,
  getTursoConfig,
  getUploadStats,
  initDatabase,
  isUploadKind,
  listTables,
  loadStaffPhotos,
  loadUploadKind,
  saveStaffPhoto,
  saveUploadKind,
  saveUploadKindChunk,
  syncAllRelationalTables,
  tursoExecute,
};
