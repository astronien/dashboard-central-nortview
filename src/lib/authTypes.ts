/**
 * Auth types — role-based access control for the dashboard.
 *
 * Roles:
 * - bsm  : Branch Sales Manager — full admin access
 * - absm : Assistant Branch Sales Manager — full admin access
 * - pia  : Sales staff — read-only access to OWN staff profile only
 */

export type Role = "bsm" | "absm" | "pia";

export const ADMIN_ROLES: Role[] = ["bsm", "absm"];

export const isAdminRole = (role: Role | null | undefined): boolean => {
  return role !== null && role !== undefined && ADMIN_ROLES.includes(role);
};

export const isPiaRole = (role: Role | null | undefined): boolean => {
  return role === "pia";
};

/**
 * Metadata stored in Supabase auth.users.user_metadata.
 * Configure via Supabase Dashboard → Authentication → Users → user → user_metadata.
 */
export type UserMetadata = {
  role: Role;
  /** STAFF ID from the Target upload (e.g. "25293"). Used to lock PIA to their own profile. */
  staff_id?: string;
  /** Full name. Optional, can be derived from officer lookup. */
  name?: string;
  /** Branch label. Optional, can be derived from officer lookup. */
  branch?: string;
};

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  staffId: string | null;
  name: string | null;
  branch: string | null;
};

export type AuthError = {
  message: string;
  code?: string;
};

export const getRoleFromMetadata = (metadata: unknown): Role | null => {
  if (!metadata || typeof metadata !== "object") return null;
  const role = (metadata as Record<string, unknown>).role;
  if (role === "bsm" || role === "absm" || role === "pia") return role;
  return null;
};

export const getStaffIdFromMetadata = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== "object") return null;
  const staffId = (metadata as Record<string, unknown>).staff_id;
  if (typeof staffId === "string" && staffId.trim() !== "") return staffId;
  return null;
};
