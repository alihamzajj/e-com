import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv, isServiceRoleConfigured } from "@/lib/config/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/errors";

function authorised(header: string | null): boolean {
  if (!serverEnv.cronSecret || !header) return false;
  const expected = Buffer.from(`Bearer ${serverEnv.cronSecret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Cancels online orders whose payment never completed and returns their stock.
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }
  const { data, error } = await createAdminClient().rpc("expire_stale_online_orders", { p_minutes: 120 });
  if (error) {
    logServerError("cron.expire-orders", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
  return NextResponse.json({ cancelled: data ?? 0 });
}
