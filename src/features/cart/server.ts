import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/public";
import { toNumber } from "@/lib/utils/format";
import type { CartQuote } from "@/types/domain";

/**
 * Cart storage. Signed-in customers: carts/cart_items (RLS: own rows only).
 * Guests: an httpOnly cookie holding only variant ids and quantities — prices
 * are never stored client-side, and the cookie is merged into the database
 * cart on sign-in. Every read is priced fresh by quote_cart().
 */

export const CART_COOKIE = "nk_cart";
export const COUPON_COOKIE = "nk_coupon";
export const MAX_LINES = 50;
export const MAX_QTY = 99;

export type CartEntry = { variantId: string; quantity: number };

const cookieSchema = z
  .array(z.object({ v: z.uuid(), q: z.number().int().min(1).max(MAX_QTY) }))
  .max(MAX_LINES);

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

async function readGuestCart(): Promise<CartEntry[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = cookieSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.map((e) => ({ variantId: e.v, quantity: e.q })) : [];
  } catch {
    return [];
  }
}

async function writeGuestCart(entries: CartEntry[]) {
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(
    CART_COOKIE,
    JSON.stringify(entries.slice(0, MAX_LINES).map((e) => ({ v: e.variantId, q: e.quantity }))),
    cookieOptions,
  );
}

async function ensureUserCart(userId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data, error } = await supabase.from("carts").insert({ user_id: userId }).select("id").single();
  if (error) {
    // Lost a race with a parallel request: read again.
    const { data: again } = await supabase.from("carts").select("id").eq("user_id", userId).single();
    return (again as { id: string }).id;
  }
  return (data as { id: string }).id;
}

export async function readCart(): Promise<CartEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getSessionUser();
  if (!user) return readGuestCart();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cart_items")
    .select("variant_id, quantity, carts!inner(user_id)")
    .eq("carts.user_id", user.id)
    .order("created_at");
  return ((data ?? []) as { variant_id: string; quantity: number }[]).map((r) => ({
    variantId: r.variant_id,
    quantity: r.quantity,
  }));
}

/** Sets the quantity of a variant (0 removes it). */
export async function setCartQuantity(variantId: string, quantity: number) {
  const qty = Math.max(0, Math.min(MAX_QTY, Math.floor(quantity)));
  const user = await getSessionUser();
  if (!user) {
    const entries = (await readGuestCart()).filter((e) => e.variantId !== variantId);
    if (qty > 0) {
      if (entries.length >= MAX_LINES) throw new Error("TOO_MANY_ITEMS");
      entries.push({ variantId, quantity: qty });
    }
    await writeGuestCart(entries);
    return;
  }
  const supabase = await createClient();
  const cartId = await ensureUserCart(user.id);
  if (qty === 0) {
    await supabase.from("cart_items").delete().eq("cart_id", cartId).eq("variant_id", variantId);
    return;
  }
  const { data: lines } = await supabase.from("cart_items").select("variant_id").eq("cart_id", cartId);
  const existing = (lines ?? []) as { variant_id: string }[];
  if (existing.length >= MAX_LINES && !existing.some((l) => l.variant_id === variantId)) {
    throw new Error("TOO_MANY_ITEMS");
  }
  const { error } = await supabase
    .from("cart_items")
    .upsert({ cart_id: cartId, variant_id: variantId, quantity: qty }, { onConflict: "cart_id,variant_id" });
  if (error) throw error;
}

export async function clearCart() {
  const user = await getSessionUser();
  if (!user) return writeGuestCart([]);
  const supabase = await createClient();
  const { data } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (data) await supabase.from("cart_items").delete().eq("cart_id", (data as { id: string }).id);
}

/** Moves a guest cookie cart into the signed-in user's cart (quantities add up). */
export async function mergeGuestCart(userId: string) {
  const guest = await readGuestCart();
  if (guest.length === 0) return;
  const supabase = await createClient();
  const cartId = await ensureUserCart(userId);
  const { data: existing } = await supabase.from("cart_items").select("variant_id, quantity").eq("cart_id", cartId);
  const current = new Map(((existing ?? []) as { variant_id: string; quantity: number }[]).map((r) => [r.variant_id, r.quantity]));
  const rows = guest.map((g) => ({
    cart_id: cartId,
    variant_id: g.variantId,
    quantity: Math.min(MAX_QTY, (current.get(g.variantId) ?? 0) + g.quantity),
  }));
  await supabase.from("cart_items").upsert(rows, { onConflict: "cart_id,variant_id" });
  await writeGuestCart([]);
}

export async function getCouponCode(): Promise<string | null> {
  return (await cookies()).get(COUPON_COOKIE)?.value ?? null;
}

export async function setCouponCode(code: string | null) {
  const store = await cookies();
  if (!code) store.delete(COUPON_COOKIE);
  else store.set(COUPON_COOKIE, code.toUpperCase().slice(0, 32), { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
}

function normaliseQuote(raw: Record<string, unknown>): CartQuote {
  const q = raw as unknown as CartQuote;
  return {
    ...q,
    subtotal: toNumber(q.subtotal),
    discount_total: toNumber(q.discount_total),
    shipping_total: toNumber(q.shipping_total),
    tax_total: toNumber(q.tax_total),
    total: toNumber(q.total),
    free_shipping_threshold: q.free_shipping_threshold == null ? null : toNumber(q.free_shipping_threshold),
    shipping_method: q.shipping_method ? { ...q.shipping_method, price: toNumber(q.shipping_method.price) } : null,
    shipping_methods: (q.shipping_methods ?? []).map((m) => ({ ...m, price: toNumber(m.price) })),
    lines: (q.lines ?? []).map((l) => ({
      ...l,
      unit_price: l.unit_price == null ? null : toNumber(l.unit_price),
      compare_at_price: l.compare_at_price == null ? null : toNumber(l.compare_at_price),
      line_total: toNumber(l.line_total),
    })),
    coupon: q.coupon ? { ...q.coupon, discount: toNumber(q.coupon.discount) } : null,
  };
}

/** Prices the current cart on the server from live database prices and stock. */
export async function getCartQuote(options: { shippingMethod?: string | null; couponCode?: string | null } = {}) {
  const entries = await readCart();
  const coupon = options.couponCode === undefined ? await getCouponCode() : options.couponCode;
  return quoteEntries(entries, options.shippingMethod ?? null, coupon);
}

export async function quoteEntries(entries: CartEntry[], shippingMethod: string | null, couponCode: string | null) {
  const empty: CartQuote = {
    currency: "PKR",
    lines: [],
    item_count: 0,
    issue_count: 0,
    subtotal: 0,
    discount_total: 0,
    shipping_total: 0,
    tax_total: 0,
    total: 0,
    shipping_method: null,
    shipping_methods: [],
    free_shipping_threshold: null,
    coupon: null,
  };
  if (!isSupabaseConfigured()) return { entries, quote: empty };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quote_cart", {
    p_items: entries.map((e) => ({ variant_id: e.variantId, quantity: e.quantity })),
    p_shipping_method: shippingMethod,
    p_coupon_code: couponCode,
  });
  if (error) throw error;
  return { entries, quote: normaliseQuote(data as Record<string, unknown>) };
}

export async function getCartCount(): Promise<number> {
  const entries = await readCart();
  return entries.reduce((sum, e) => sum + e.quantity, 0);
}
