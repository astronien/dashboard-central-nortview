/**
 * Seed admin user to Turso.
 *
 * Run with: npx tsx scripts/seed-admin.ts
 *
 * Reads VITE_TURSO_DATABASE_URL + VITE_TURSO_AUTH_TOKEN from .env
 * (manually load via dotenv if not auto-loaded by Vite).
 *
 * Creates:
 *   - admin / admin123  (BSM)
 *   - asst_admin / admin123  (Asst. BSM)
 *
 * Both flagged mustChangePassword=1 so they're forced to change on first login.
 */
import "dotenv/config";
import { initSchema, getTursoClient, isTursoConfigured } from "../src/lib/auth/tursoClient";
import { createUser, getUserByUsername } from "../src/lib/auth/users";

async function main() {
  if (!isTursoConfigured()) {
    console.error(
      "❌ Turso is not configured.\n" +
        "Set VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN in .env before running this script.",
    );
    process.exit(1);
  }

  console.log("→ Initialising schema...");
  await initSchema();
  console.log("✓ Schema ready");

  const admins = [
    { username: "admin", name: "Branch Sales Manager" },
    { username: "asst_admin", name: "Assistant Branch Sales Manager" },
  ];

  for (const a of admins) {
    const existing = await getUserByUsername(a.username).catch(() => null);
    if (existing) {
      console.log(`✓ ${a.username} already exists, skipping`);
      continue;
    }
    await createUser({
      username: a.username,
      password: "admin123",
      role: "admin",
      name: a.name,
      mustChangePassword: true,
    });
    console.log(`✓ Created admin: ${a.username} / admin123`);
  }

  console.log("\n🎉 Seed complete. You can now login with:");
  console.log("   admin / admin123   (BSM)");
  console.log("   asst_admin / admin123   (Asst. BSM)");

  // Note: @libsql/client Node version does not require explicit close.
  // Process exit will release the HTTP connection.
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
