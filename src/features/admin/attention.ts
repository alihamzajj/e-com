import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { profileHasPermission } from "@/lib/auth/session";
import type { Profile } from "@/types/domain";

/** Orders that are confirmed but not yet handed to the courier. */
export const TO_SHIP_STATUSES = ["confirmed", "processing"] as const;

export type AttentionCounts = {
  toConfirm: number | null;
  toShip: number | null;
  lowStock: number | null;
  questions: number | null;
  reports: number | null;
  support: number | null;
};

/** Products with at least one active variant at or below its low-stock threshold. */
export async function lowStockProductIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variants")
    .select("product_id, stock_quantity, is_active, products!inner(low_stock_threshold)")
    .eq("is_active", true)
    .limit(5000);
  type V = { product_id: string; stock_quantity: number; products: { low_stock_threshold: number } };
  return [...new Set(((data ?? []) as unknown as V[]).filter((v) => v.stock_quantity <= v.products.low_stock_threshold).map((v) => v.product_id))];
}

/**
 * Work waiting for the staff member: drives the dashboard to-do list and the
 * sidebar badges. A count is null when the profile lacks that permission.
 */
export const getAttentionCounts = cache(async (profile: Profile): Promise<AttentionCounts> => {
  const supabase = await createClient();
  const can = (p: Parameters<typeof profileHasPermission>[1]) => profileHasPermission(profile, p);
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [toConfirm, toShip, lowStock, questions, reports, support] = await Promise.all([
    can("orders") ? count(supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending")) : null,
    can("orders") ? count(supabase.from("orders").select("id", { count: "exact", head: true }).in("status", [...TO_SHIP_STATUSES])) : null,
    can("products") ? lowStockProductIds().then((ids) => ids.length) : null,
    can("support") ? count(supabase.from("product_questions").select("id", { count: "exact", head: true }).eq("status", "pending")) : null,
    can("support") ? count(supabase.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "open")) : null,
    can("support") ? count(supabase.from("support_messages").select("id", { count: "exact", head: true }).eq("status", "new")) : null,
  ]);
  return { toConfirm, toShip, lowStock, questions, reports, support };
});
