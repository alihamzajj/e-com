/**
 * Real concurrency check against a STAGING Supabase project (never production).
 * Run with: RUN_LIVE_DB_TESTS=1 npm run test:live
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and
 * SUPABASE_SECRET_KEY. It creates a temporary product with one unit and two
 * temporary users, has both buy the last unit at the same instant, then cleans up.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const enabled = process.env.RUN_LIVE_DB_TESTS === "1" && url && anonKey && serviceKey;

describe.skipIf(!enabled)("live: concurrent purchases of the last unit", () => {
  let admin: SupabaseClient;
  const userIds: string[] = [];
  let productId = "";
  let variantId = "";
  const tag = randomUUID().slice(0, 8);

  beforeAll(async () => {
    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: product, error } = await admin
      .from("products")
      .insert({ name: `Concurrency test ${tag}`, slug: `concurrency-test-${tag}`, price: 100, status: "active" })
      .select("id")
      .single();
    if (error) throw error;
    productId = product.id;
    const { data: variant } = await admin
      .from("product_variants")
      .insert({ product_id: productId, sku: `CONC-${tag}`.toUpperCase(), title: "Default", stock_quantity: 1 })
      .select("id")
      .single();
    variantId = variant!.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from("orders").delete().in("user_id", userIds);
    await admin.from("products").delete().eq("id", productId);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  });

  async function buyer(n: number) {
    const email = `concurrency-${tag}-${n}@example.com`;
    const password = `Pw-${randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userIds.push(data.user.id);
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email, password });
    return client;
  }

  it("sells the unit exactly once", async () => {
    const [a, b] = await Promise.all([buyer(1), buyer(2)]);
    const payload = () => ({
      idempotency_key: randomUUID(),
      payment_method: "cod",
      shipping_method: null,
      contact: { name: "Test", email: "test@example.com", phone: "03001234567" },
      address: { full_name: "Test", line1: "1 Test St", city: "Lahore" },
      items: [{ variant_id: variantId, quantity: 1 }],
    });
    const results = await Promise.all([a.rpc("place_order", { p_payload: payload() }), b.rpc("place_order", { p_payload: payload() })]);
    const succeeded = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    expect(succeeded).toHaveLength(1);
    expect(failed[0].error!.message).toMatch(/STOCK_UNAVAILABLE/);

    const { data: v } = await admin.from("product_variants").select("stock_quantity").eq("id", variantId).single();
    expect(v!.stock_quantity).toBe(0);
  });
});
