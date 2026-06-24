/**
 * Auth helpers — wraps Supabase Auth API with role/session helpers.
 */

import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
import {
  getRoleFromMetadata,
  getStaffIdFromMetadata,
  type SessionUser,
  type AuthError,
} from "./authTypes";

export type AuthResult = {
  user: SessionUser | null;
  error: AuthError | null;
};

const mapSupabaseUser = (user: User | null): SessionUser | null => {
  if (!user) return null;
  const meta = user.user_metadata;
  const role = getRoleFromMetadata(meta);
  if (!role) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    staffId: getStaffIdFromMetadata(meta),
    name: typeof meta?.name === "string" ? (meta.name as string) : null,
    branch: typeof meta?.branch === "string" ? (meta.branch as string) : null,
  };
};

export const login = async (email: string, password: string): Promise<AuthResult> => {
  if (!isSupabaseConfigured()) {
    return { user: null, error: { message: "Supabase ยังไม่ได้ตั้งค่า (ดู .env)" } };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: { message: "ไม่สามารถเชื่อมต่อ Supabase" } };
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { user: null, error: { message: error.message, code: error.name } };
  }
  const user = mapSupabaseUser(data.user);
  if (!user) {
    return {
      user: null,
      error: { message: "บัญชีนี้ไม่มี role ที่ถูกต้อง (ติดต่อผู้ดูแลระบบ)" },
    };
  }
  return { user, error: null };
};

export const logout = async (): Promise<AuthError | null> => {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const { error } = await client.auth.signOut();
  if (error) return { message: error.message, code: error.name };
  return null;
};

export const getCurrentSession = async (): Promise<{
  session: Session | null;
  user: SessionUser | null;
}> => {
  if (!isSupabaseConfigured()) return { session: null, user: null };
  const client = getSupabaseClient();
  if (!client) return { session: null, user: null };
  const { data } = await client.auth.getSession();
  return { session: data.session, user: mapSupabaseUser(data.session?.user ?? null) };
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
};
