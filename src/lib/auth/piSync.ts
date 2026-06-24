/**
 * piSync — synchronize PIA user records from the staff list (target upload).
 *
 * On every target upload, walk through the officers and ensure each one has
 * a corresponding PIA user (with default password = emp_id). Skips admin
 * users and officers that already have a user account.
 */
import { createUser, getUserByUsername, type User } from "./users";

type OfficerLike = {
  name?: string;
  empId?: string | null;
  branch?: string | null;
};

export type SyncResult = {
  created: number;
  skipped: number;
  errors: string[];
};

export async function syncPiaFromOfficers(
  officers: OfficerLike[],
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, skipped: 0, errors: [] };
  for (const officer of officers) {
    const empId = String(officer.empId ?? "").trim();
    if (!empId) {
      result.skipped++;
      continue;
    }
    try {
      const existing: User | null = (await getUserByUsername(empId))?.user ?? null;
      if (existing) {
        result.skipped++;
        continue;
      }
      const name = String(officer.name ?? "").trim() || empId;
      const branch = officer.branch ?? null;
      await createUser({
        username: empId,
        password: empId, // default password = emp_id (force change on first login)
        role: "pia",
        name,
        branch,
        officerId: empId,
        mustChangePassword: true,
      });
      result.created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Ignore "UNIQUE constraint" — user already exists (race condition)
      if (msg.includes("UNIQUE")) {
        result.skipped++;
      } else {
        result.errors.push(`${empId}: ${msg}`);
      }
    }
  }
  return result;
}
