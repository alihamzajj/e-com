import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/public";
import { serverEnv } from "@/lib/config/server";

/**
 * Service-role client. Bypasses RLS — use only for trusted server work that
 * has already been authorised (payment webhooks, refunds, rate limiting,
 * anonymous form submissions after validation).
 */
export function createAdminClient() {
  if (!serverEnv.supabaseServiceKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured");
  }
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
