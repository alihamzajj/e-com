import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/public";
import type { Permission, Profile } from "@/types/domain";

export type SessionUser = { id: string; email: string | null };

/** Verified identity from the session JWT (signature checked by getClaims). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Always touch the request first so session-dependent UI is never prerendered
  // as "signed out", even in a build without Supabase configured.
  await cookies();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, permissions, marketing_opt_in, created_at")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export function profileHasPermission(profile: Pick<Profile, "role" | "permissions"> | null, permission: Permission) {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.role === "staff" && profile.permissions.includes(permission);
}

export function isStaffProfile(profile: Pick<Profile, "role"> | null) {
  return profile?.role === "staff" || profile?.role === "admin";
}

/** For admin pages: signed-in staff only. Customers are sent home. */
export async function requireStaff(next = "/admin"): Promise<Profile> {
  await requireUser(next);
  const profile = await getProfile();
  if (!profile || !isStaffProfile(profile)) redirect("/");
  return profile;
}

export async function requirePermission(permission: Permission, next = "/admin"): Promise<Profile> {
  const profile = await requireStaff(next);
  if (!profileHasPermission(profile, permission)) redirect("/admin?denied=" + permission);
  return profile;
}
