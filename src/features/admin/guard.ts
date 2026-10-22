import "server-only";
import { getProfile, profileHasPermission } from "@/lib/auth/session";
import type { Permission, Profile } from "@/types/domain";

/**
 * Server Action guard. Re-reads the session and profile on every call — never
 * trust that the page that rendered the form was authorised.
 */
export async function actionProfile(permission: Permission | "admin"): Promise<Profile | null> {
  const profile = await getProfile();
  if (!profile) return null;
  if (permission === "admin") return profile.role === "admin" ? profile : null;
  return profileHasPermission(profile, permission) ? profile : null;
}

export const FORBIDDEN = { ok: false as const, error: "You do not have permission to do that." };

export function searchParam(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

export function pageParam(sp: Record<string, string | string[] | undefined>): number {
  const n = Number(searchParam(sp, "page") ?? 1);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

/** Strip characters that have meaning inside a PostgREST or() filter. */
export function safeSearch(q: string | undefined): string | undefined {
  const cleaned = q?.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || undefined;
}

export function buildHref(base: string, sp: Record<string, string | undefined>, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v !== undefined && v !== "" && !(k === "page" && String(v) === "1")) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
