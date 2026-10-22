import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { logServerError } from "@/lib/errors";

/** Best-effort client IP from the platform proxy headers (Vercel sets these). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window limiter stored in Postgres (works across serverless instances).
 * Fails closed when the limiter cannot be reached, so abuse protection is never
 * silently disabled.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  if (!isServiceRoleConfigured()) return false;
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key.slice(0, 200),
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    logServerError("rate-limit", error);
    return false;
  }
  return data === true;
}
