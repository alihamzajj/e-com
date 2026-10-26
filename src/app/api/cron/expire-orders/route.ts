import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv, isServiceRoleConfigured } from "@/lib/config/server";
import { isSupabaseConfigured } from "@/lib/config/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { logServerError } from "@/lib/errors";

function authorised(header: string | null): boolean {
  if (!serverEnv.cronSecret || !header) return false;
  const expected = Buffer.from(`Bearer ${serverEnv.cronSecret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily maintenance, called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`.
 * 1. Keep-alive: a tiny database read every day, so a free-plan Supabase project
 *    is never paused for inactivity (it pauses after about a week without requests).
 *    Uses the publishable key, so it works even without SUPABASE_SECRET_KEY.
 * 2. Cancels online orders whose payment never completed and returns their stock
 *    (needs the service role).
 */
export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const ping = await createPublicClient().from("store_settings").select("id").eq("id", 1).maybeSingle();
  if (ping.error) {
    logServerError("cron.keep-alive", ping.error);
    return NextResponse.json({ error: "Database unreachable" }, { status: 500 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ keptAlive: true, cancelled: null, note: "SUPABASE_SECRET_KEY not set; order expiry skipped" });
  }
  const { data, error } = await createAdminClient().rpc("expire_stale_online_orders", { p_minutes: 120 });
  if (error) {
    logServerError("cron.expire-orders", error);
    return NextResponse.json({ keptAlive: true, error: "Order expiry failed" }, { status: 500 });
  }
  return NextResponse.json({ keptAlive: true, cancelled: data ?? 0 });
}
