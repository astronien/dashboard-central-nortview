/**
 * User management + password hashing (SHA-256 + per-user salt).
 *
 * Hashing uses Web Crypto API (crypto.subtle.digest) when available,
 * falls back to a JS-only implementation for Node test environments.
 */

export type Role = "admin" | "pia";

export type User = {
  id: number;
  username: string;
  role: Role;
  name: string;
  branch: string | null;
  officerId: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  role: Role;
  name: string;
  branch: string | null;
  officer_id: string | null;
  must_change_password: number;
  created_at: string;
  last_login_at: string | null;
};

export const PASSWORD_SALT_BYTES = 16;

/**
 * Generate a random salt (hex string). Uses crypto.getRandomValues
 * if available, otherwise a simple fallback for tests.
 */
export function generateSalt(bytes: number = PASSWORD_SALT_BYTES): string {
  const buf = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < bytes; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(message: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(message);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback: tiny SHA-256 implementation for Node tests
  return sha256Sync(message);
}

function sha256Sync(message: string): string {
  // Lightweight pure-JS SHA-256 for Node test environment
  function rightRotate(n: number, b: number) {
    return (n >>> b) | (n << (32 - b));
  }
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  const bytes = new TextEncoder().encode(message);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  for (let i = 0; i < padded.length; i += 64) {
    const W = new Array(64);
    for (let t = 0; t < 16; t++) {
      W[t] = dv.getUint32(i + t * 4);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + mj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H = H.map((v, i) => (v + [a, b, c, d, e, f, g, h][i]) >>> 0);
  }
  return H.map((v) => v.toString(16).padStart(8, "0")).join("");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${password}`);
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return actual === expectedHash;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    name: row.name,
    branch: row.branch,
    officerId: row.officer_id,
    mustChangePassword: row.must_change_password === 1,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

import { getTursoClient } from "./tursoClient";

export async function getUserByUsername(username: string): Promise<{
  user: User;
  passwordHash: string;
  salt: string;
} | null> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE username = ? LIMIT 1",
    args: [username],
  });
  const row = result.rows[0] as unknown as UserRow | undefined;
  if (!row) return null;
  return {
    user: mapRow(row),
    passwordHash: row.password_hash,
    salt: row.salt,
  };
}

export async function getUserById(id: number): Promise<User | null> {
  const client = getTursoClient();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0] as unknown as UserRow | undefined;
  return row ? mapRow(row) : null;
}

export async function listUsers(role?: Role): Promise<User[]> {
  const client = getTursoClient();
  const sql = role
    ? "SELECT * FROM users WHERE role = ? ORDER BY name"
    : "SELECT * FROM users ORDER BY role, name";
  const result = await client.execute({
    sql,
    args: role ? [role] : [],
  });
  return (result.rows as unknown as UserRow[]).map(mapRow);
}

export async function createUser(input: {
  username: string;
  password: string;
  role: Role;
  name: string;
  branch?: string | null;
  officerId?: string | null;
  mustChangePassword?: boolean;
}): Promise<User> {
  const client = getTursoClient();
  const salt = generateSalt();
  const passwordHash = await hashPassword(input.password, salt);
  await client.execute({
    sql: `INSERT INTO users
      (username, password_hash, salt, role, name, branch, officer_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.username,
      passwordHash,
      salt,
      input.role,
      input.name,
      input.branch ?? null,
      input.officerId ?? null,
      input.mustChangePassword === false ? 0 : 1,
    ],
  });
  const created = await getUserByUsername(input.username);
  if (!created) throw new Error("Failed to create user");
  return created.user;
}

export async function updatePassword(
  userId: number,
  newPassword: string,
): Promise<void> {
  const client = getTursoClient();
  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  await client.execute({
    sql: `UPDATE users
      SET password_hash = ?, salt = ?, must_change_password = 0
      WHERE id = ?`,
    args: [passwordHash, salt, userId],
  });
}

export async function updateLastLogin(userId: number): Promise<void> {
  const client = getTursoClient();
  await client.execute({
    sql: "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
    args: [userId],
  });
}

export async function deleteUser(userId: number): Promise<void> {
  const client = getTursoClient();
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
}
