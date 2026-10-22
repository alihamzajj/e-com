import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestDb, anon, service, user } from "./harness";

let db: TestDb;
let alice: string;
let bob: string;
let staffOrders: string;
let staffSupport: string;
let admin: string;

const ARC75_CHALK_LIN = "ARC75-CHK-LIN";
const ARC75_GRA_LIN = "ARC75-GRA-LIN";
const ARC75_GRA_TAC = "ARC75-GRA-TAC"; // seeded with 0 stock
const TOOLKIT = "TOOLKIT"; // seeded with 3 stock
const SW_LIN_110 = "SW-LIN-110"; // variant price 8600, sale 7900

async function variantId(sku: string) {
  const [row] = await db.sql<{ id: string }>(`select id from public.product_variants where sku = $1`, [sku]);
  return row.id;
}
async function stock(sku: string) {
  const [row] = await db.sql<{ stock_quantity: number }>(
    `select stock_quantity from public.product_variants where sku = $1`, [sku]);
  return row.stock_quantity;
}

let keyCounter = 0;
async function placeOrder(uid: string, items: { sku: string; quantity: number }[], extra: Record<string, unknown> = {}) {
  const payload = {
    idempotency_key: `test-key-${++keyCounter}-${Date.now()}`,
    payment_method: "cod",
    shipping_method: "standard",
    contact: { name: "Test Buyer", email: "buyer@example.com", phone: "+923001234567" },
    address: { full_name: "Test Buyer", phone: "+923001234567", line1: "1 Test Street", city: "Lahore", country: "PK" },
    items: await Promise.all(items.map(async (i) => ({ variant_id: await variantId(i.sku), quantity: i.quantity }))),
    ...extra,
  };
  const row = await db.one<{ result: Record<string, unknown> }>(user(uid), `select public.place_order($1::jsonb) as result`, [
    JSON.stringify(payload),
  ]);
  return { ...(row.result as { order_id: string; order_number: string; total: number; duplicate: boolean }), payload };
}

beforeAll(async () => {
  db = await TestDb.create({ seed: true });
  alice = await db.createUser("alice@example.com");
  bob = await db.createUser("bob@example.com");
  staffOrders = await db.createUser("orders@example.com", "staff", ["orders"]);
  staffSupport = await db.createUser("support@example.com", "staff", ["support"]);
  admin = await db.createUser("admin@example.com", "admin");
});

afterAll(async () => {
  await db?.close();
});

describe("catalog visibility and search", () => {
  it("hides draft products from anonymous visitors but shows them to product staff", async () => {
    await db.sql(`insert into public.products (name, slug, price, status) values ('Secret', 'secret-draft', 100, 'draft')`);
    const anonRows = await db.as(anon, `select slug from public.products where slug = 'secret-draft'`);
    expect(anonRows).toHaveLength(0);
    const adminRows = await db.as(user(admin), `select slug from public.products where slug = 'secret-draft'`);
    expect(adminRows).toHaveLength(1);
  });

  it("filters by category including price bounds and sorts by price", async () => {
    const rows = await db.as<{ slug: string; min_variant_price: string; total_count: string }>(
      anon,
      `select slug, min_variant_price, total_count from public.catalog_search(p_category_slug => 'keyboards', p_sort => 'price_asc')`,
    );
    expect(rows.map((r) => r.slug)).toEqual(["mono-60", "arc-65-compact", "arc-75-wireless", "slate-tkl-pro"]);
    expect(Number(rows[0].total_count)).toBe(4);
    const prices = rows.map((r) => Number(r.min_variant_price));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    const bounded = await db.as<{ slug: string }>(
      anon, `select slug from public.catalog_search(p_min_price => 20000, p_max_price => 30000)`);
    expect(bounded.map((r) => r.slug).sort()).toEqual(["arc-65-compact", "arc-75-wireless"]);
  });

  it("supports prefix keyword search and pagination with a stable total", async () => {
    const found = await db.as<{ slug: string }>(anon, `select slug from public.catalog_search(p_query => 'walnu')`);
    expect(found.map((r) => r.slug).sort()).toEqual(["walnut-tactile-switches", "walnut-wrist-rest"]);

    const page1 = await db.as<{ slug: string; total_count: string }>(
      anon, `select slug, total_count from public.catalog_search(p_limit => 5, p_offset => 0)`);
    const page3 = await db.as<{ slug: string; total_count: string }>(
      anon, `select slug, total_count from public.catalog_search(p_limit => 5, p_offset => 10)`);
    expect(page1).toHaveLength(5);
    expect(page3).toHaveLength(3);
    expect(page1[0].total_count).toBe(page3[0].total_count);
  });

  it("can restrict to in-stock products", async () => {
    const rows = await db.as<{ slug: string }>(anon, `select slug from public.catalog_search(p_in_stock => true, p_limit => 60)`);
    expect(rows.map((r) => r.slug)).not.toContain("ember-artisan-esc");
  });
});

describe("pricing and quotes", () => {
  it("prices variants, sales, shipping and free-shipping threshold on the server", async () => {
    const items = [
      { variant_id: await variantId(SW_LIN_110), quantity: 2 }, // 7900 each (variant sale)
      { variant_id: await variantId(ARC75_CHALK_LIN), quantity: 1 }, // 28500 (product sale)
    ];
    const { quote } = await db.one<{ quote: Record<string, any> }>(
      anon, `select public.quote_cart($1::jsonb, 'standard', null) as quote`, [JSON.stringify(items)]);
    expect(Number(quote.subtotal)).toBe(2 * 7900 + 28500);
    // free_shipping_threshold = 25000 in the seed
    expect(Number(quote.shipping_total)).toBe(0);
    expect(Number(quote.total)).toBe(44300);
  });

  it("charges shipping below the threshold and rejects unknown shipping methods", async () => {
    const items = [{ variant_id: await variantId(TOOLKIT), quantity: 1 }];
    const { quote } = await db.one<{ quote: Record<string, any> }>(
      anon, `select public.quote_cart($1::jsonb, 'express', null) as quote`, [JSON.stringify(items)]);
    expect(Number(quote.shipping_total)).toBe(600);
    expect(Number(quote.total)).toBe(2400);
    await expect(db.as(anon, `select public.quote_cart($1::jsonb, 'teleport', null)`, [JSON.stringify(items)]))
      .rejects.toThrow(/INVALID_SHIPPING_METHOD/);
  });

  it("applies a percentage coupon with a cap and minimum order", async () => {
    const big = [{ variant_id: await variantId(ARC75_CHALK_LIN), quantity: 2 }]; // 57000
    const { quote } = await db.one<{ quote: Record<string, any> }>(
      user(alice), `select public.quote_cart($1::jsonb, 'standard', 'welcome10') as quote`, [JSON.stringify(big)]);
    expect(quote.coupon.valid).toBe(true);
    expect(Number(quote.discount_total)).toBe(3000); // 5700 capped at 3000

    const small = [{ variant_id: await variantId(TOOLKIT), quantity: 1 }];
    const { quote: q2 } = await db.one<{ quote: Record<string, any> }>(
      user(alice), `select public.quote_cart($1::jsonb, 'standard', 'WELCOME10') as quote`, [JSON.stringify(small)]);
    expect(q2.coupon.valid).toBe(false);
    expect(q2.coupon.error).toBe("COUPON_MIN_ORDER");
    expect(Number(q2.discount_total)).toBe(0);
  });

  it("flags out-of-stock lines instead of pricing them", async () => {
    const items = [{ variant_id: await variantId(ARC75_GRA_TAC), quantity: 1 }];
    const { quote } = await db.one<{ quote: Record<string, any> }>(
      anon, `select public.quote_cart($1::jsonb) as quote`, [JSON.stringify(items)]);
    expect(quote.lines[0].issue).toBe("out_of_stock");
    expect(Number(quote.subtotal)).toBe(0);
  });
});

describe("order placement", () => {
  it("requires authentication", async () => {
    await expect(db.as(anon, `select public.place_order('{}'::jsonb)`)).rejects.toThrow(/permission denied/);
  });

  it("creates the order, snapshots items, decrements stock and logs inventory", async () => {
    const before = await stock(ARC75_CHALK_LIN);
    const order = await placeOrder(alice, [{ sku: ARC75_CHALK_LIN, quantity: 2 }]);
    expect(order.duplicate).toBe(false);
    expect(Number(order.total)).toBe(57000); // free shipping above threshold
    expect(await stock(ARC75_CHALK_LIN)).toBe(before - 2);

    const [item] = await db.sql<Record<string, any>>(`select * from public.order_items where order_id = $1`, [order.order_id]);
    expect(item.product_name).toBe("Arc 75 Wireless");
    expect(item.sku).toBe(ARC75_CHALK_LIN);
    expect(Number(item.unit_price)).toBe(28500);
    expect(item.options).toEqual({ Color: "Chalk", Switch: "Linear" });

    const movements = await db.sql<Record<string, any>>(
      `select quantity_change, reason from public.inventory_movements where order_id = $1`, [order.order_id]);
    expect(movements).toEqual([{ quantity_change: -2, reason: "order" }]);
  });

  it("ignores client-supplied totals entirely", async () => {
    const order = await placeOrder(alice, [{ sku: TOOLKIT, quantity: 1 }], { total: 1, subtotal: 1, discount_total: 99999 });
    expect(Number(order.total)).toBe(1800 + 250);
  });

  it("is idempotent for retries of the same submission", async () => {
    const before = await stock(ARC75_CHALK_LIN);
    const first = await placeOrder(bob, [{ sku: ARC75_CHALK_LIN, quantity: 1 }]);
    const retry = await db.one<{ result: Record<string, any> }>(
      user(bob), `select public.place_order($1::jsonb) as result`, [JSON.stringify(first.payload)]);
    expect(retry.result.duplicate).toBe(true);
    expect(retry.result.order_id).toBe(first.order_id);
    expect(await stock(ARC75_CHALK_LIN)).toBe(before - 1);
  });

  it("refuses to oversell: the last unit can only be bought once", async () => {
    const remaining = await stock(TOOLKIT);
    await placeOrder(alice, [{ sku: TOOLKIT, quantity: remaining }]);
    expect(await stock(TOOLKIT)).toBe(0);
    await expect(placeOrder(bob, [{ sku: TOOLKIT, quantity: 1 }])).rejects.toThrow(/STOCK_UNAVAILABLE/);
    expect(await stock(TOOLKIT)).toBe(0);
  });

  it("rejects quantities above available stock", async () => {
    const available = await stock(ARC75_GRA_LIN);
    await expect(placeOrder(alice, [{ sku: ARC75_GRA_LIN, quantity: available + 1 }])).rejects.toThrow(/STOCK_UNAVAILABLE/);
  });

  it("never lets stock go negative even when written directly", async () => {
    await expect(db.sql(`update public.product_variants set stock_quantity = -1 where sku = $1`, [ARC75_GRA_LIN]))
      .rejects.toThrow(/check constraint/);
  });

  it("refuses online payment when the store has not enabled it", async () => {
    await expect(placeOrder(alice, [{ sku: ARC75_GRA_LIN, quantity: 1 }], { payment_method: "online" }))
      .rejects.toThrow(/PAYMENT_METHOD_UNAVAILABLE/);
  });

  it("enforces per-customer coupon limits", async () => {
    await placeOrder(bob, [{ sku: "KC-EMBER-CHY", quantity: 1 }], { coupon_code: "WELCOME10" });
    await expect(placeOrder(bob, [{ sku: "KC-EMBER-CHY", quantity: 1 }], { coupon_code: "WELCOME10" }))
      .rejects.toThrow(/COUPON_ALREADY_USED/);
  });

  it("rejects expired coupons", async () => {
    await db.sql(`insert into public.coupons (code, discount_type, value, starts_at, ends_at)
                  values ('OLD5', 'fixed', 500, now() - interval '10 days', now() - interval '1 day')`);
    await expect(placeOrder(alice, [{ sku: "KC-FOG", quantity: 1 }], { coupon_code: "OLD5" })).rejects.toThrow(/COUPON_EXPIRED/);
  });
});

describe("privacy and permissions", () => {
  it("customers only see their own orders, items and addresses", async () => {
    await db.as(user(alice), `insert into public.addresses (user_id, full_name, phone, line1, city) values ($1, 'A', '03001234567', 'x', 'Lahore')`, [alice]);
    const bobOrders = await db.as<{ user_id: string }>(user(bob), `select user_id from public.orders`);
    expect(bobOrders.length).toBeGreaterThan(0);
    expect(bobOrders.every((o) => o.user_id === bob)).toBe(true);

    const aliceOrderIds = (await db.sql<{ id: string }>(`select id from public.orders where user_id = $1`, [alice])).map((r) => r.id);
    const leaked = await db.as(user(bob), `select * from public.order_items where order_id = any($1::uuid[])`, [aliceOrderIds]);
    expect(leaked).toHaveLength(0);
    expect(await db.as(user(bob), `select * from public.addresses`)).toHaveLength(0);
    expect(await db.as(anon, `select * from public.orders`).catch(() => [])).toHaveLength(0);
  });

  it("customers cannot insert addresses for someone else", async () => {
    await expect(db.as(user(bob), `insert into public.addresses (user_id, full_name, phone, line1, city) values ($1, 'X', '03001234567', 'x', 'Lahore')`, [alice]))
      .rejects.toThrow(/row-level security/);
  });

  it("customers cannot grant themselves a role", async () => {
    await expect(db.as(user(alice), `update public.profiles set role = 'admin' where id = $1`, [alice]))
      .rejects.toThrow(/permission denied/);
    await expect(db.as(user(alice), `select public.admin_set_user_role($1, 'admin', '{}')`, [alice]))
      .rejects.toThrow(/FORBIDDEN/);
    const [profile] = await db.sql<{ role: string }>(`select role from public.profiles where id = $1`, [alice]);
    expect(profile.role).toBe("customer");
  });

  it("customers can update their own name but not other profiles", async () => {
    await db.as(user(alice), `update public.profiles set full_name = 'Alice A' where id = $1`, [alice]);
    const rows = await db.as(user(alice), `update public.profiles set full_name = 'Hacked' where id = $1 returning id`, [bob]);
    expect(rows).toHaveLength(0);
    const [b] = await db.sql<{ full_name: string }>(`select full_name from public.profiles where id = $1`, [bob]);
    expect(b.full_name).toBe("bob");
  });

  it("staff need the matching permission", async () => {
    const orders = await db.as(user(staffOrders), `select id from public.orders`);
    expect(orders.length).toBeGreaterThan(1);
    // orders staff cannot edit products or read audit logs
    const updated = await db.as(user(staffOrders), `update public.products set price = 1 where slug = 'mono-60' returning id`);
    expect(updated).toHaveLength(0);
    expect(await db.as(user(staffOrders), `select * from public.audit_logs`)).toHaveLength(0);
    // support staff cannot read orders
    expect(await db.as(user(staffSupport), `select id from public.orders`)).toHaveLength(0);
  });

  it("payment gateway functions are not callable from client roles", async () => {
    await expect(db.as(user(admin), `select public.record_gateway_payment('stripe','evt','t',gen_random_uuid(),'ref',1,'PKR','succeeded')`))
      .rejects.toThrow(/permission denied/);
    await expect(db.as(anon, `select public.check_rate_limit('x', 1, 60)`)).rejects.toThrow(/permission denied/);
  });

  it("admin product changes are written to the audit log", async () => {
    await db.as(user(admin), `update public.products set price = 18900 where slug = 'mono-60'`);
    const logs = await db.as<{ action: string; details: any }>(user(admin),
      `select action, details from public.audit_logs where entity = 'products' and action = 'update' order by id desc limit 1`);
    expect(logs[0].details.price).toEqual({ from: 18500, to: 18900 });
  });
});

describe("fulfilment, payments and refunds", () => {
  it("enforces valid status transitions and restocks on cancellation", async () => {
    const before = await stock("ARC65-CHK");
    const order = await placeOrder(alice, [{ sku: "ARC65-CHK", quantity: 2 }]);
    expect(await stock("ARC65-CHK")).toBe(before - 2);

    await expect(db.as(user(staffOrders), `select public.admin_update_order_status($1, 'delivered')`, [order.order_id]))
      .rejects.toThrow(/INVALID_STATUS_TRANSITION/);
    await expect(db.as(user(staffSupport), `select public.admin_update_order_status($1, 'confirmed')`, [order.order_id]))
      .rejects.toThrow(/FORBIDDEN/);

    await db.as(user(staffOrders), `select public.admin_update_order_status($1, 'confirmed', 'Called customer')`, [order.order_id]);
    await db.as(user(staffOrders), `select public.admin_update_order_status($1, 'cancelled', 'Customer request')`, [order.order_id]);
    expect(await stock("ARC65-CHK")).toBe(before);

    const history = await db.as<{ from_status: string; to_status: string }>(user(alice),
      `select from_status, to_status from public.order_status_history where order_id = $1 order by created_at, to_status`, [order.order_id]);
    expect(history.map((h) => h.to_status)).toEqual(["pending", "confirmed", "cancelled"]);
  });

  it("releases coupon usage when an order is cancelled", async () => {
    await db.sql(`insert into public.coupons (code, discount_type, value, usage_limit) values ('ONEUSE', 'fixed', 100, 1)`);
    const order = await placeOrder(alice, [{ sku: "KC-FOG", quantity: 1 }], { coupon_code: "ONEUSE" });
    await expect(placeOrder(bob, [{ sku: "KC-FOG", quantity: 1 }], { coupon_code: "ONEUSE" })).rejects.toThrow(/COUPON_USAGE_LIMIT/);
    await db.as(user(alice), `select public.cancel_my_order($1)`, [order.order_id]);
    const again = await placeOrder(bob, [{ sku: "KC-FOG", quantity: 1 }], { coupon_code: "ONEUSE" });
    expect(Number(again.total)).toBe(8800 - 100 + 250);
  });

  it("customers can only cancel their own pending orders", async () => {
    const order = await placeOrder(alice, [{ sku: "MAT-M", quantity: 1 }]);
    await expect(db.as(user(bob), `select public.cancel_my_order($1)`, [order.order_id])).rejects.toThrow(/ORDER_NOT_FOUND/);
    await db.as(user(staffOrders), `select public.admin_update_order_status($1, 'confirmed')`, [order.order_id]);
    await expect(db.as(user(alice), `select public.cancel_my_order($1)`, [order.order_id])).rejects.toThrow(/ORDER_NOT_CANCELLABLE/);
  });

  it("records COD cash only for the exact total and never for online orders", async () => {
    const order = await placeOrder(alice, [{ sku: "MAT-L", quantity: 1 }]);
    await expect(db.as(user(staffOrders), `select public.admin_record_cod_payment($1, 1)`, [order.order_id]))
      .rejects.toThrow(/AMOUNT_MISMATCH/);
    await db.as(user(staffOrders), `select public.admin_record_cod_payment($1, $2)`, [order.order_id, order.total]);
    const [o] = await db.sql<Record<string, any>>(`select payment_status, paid_total from public.orders where id = $1`, [order.order_id]);
    expect(o.payment_status).toBe("paid");
    await expect(db.as(user(staffOrders), `select public.admin_record_cod_payment($1, $2)`, [order.order_id, order.total]))
      .rejects.toThrow(/ALREADY_PAID/);

    // partial then full refund
    await db.as(user(staffOrders), `select public.admin_record_manual_refund($1, 1000, 'Damaged box')`, [order.order_id]);
    await expect(db.as(user(staffOrders), `select public.admin_record_manual_refund($1, 999999, 'too much')`, [order.order_id]))
      .rejects.toThrow(/INVALID_REFUND_AMOUNT/);
    const [p] = await db.sql<Record<string, any>>(`select payment_status, refunded_total from public.orders where id = $1`, [order.order_id]);
    expect(p.payment_status).toBe("partially_refunded");
    expect(Number(p.refunded_total)).toBe(1000);
  });

  describe("online payments", () => {
    let orderId: string;
    let total: number;

    beforeAll(async () => {
      await db.sql(`update public.store_settings set online_payments_enabled = true`);
      const order = await placeOrder(bob, [{ sku: ARC75_GRA_LIN, quantity: 1 }], { payment_method: "online" });
      orderId = order.order_id;
      total = Number(order.total);
      await db.as(service, `select public.attach_payment_session($1, 'stripe', 'cs_test_1', 'https://checkout.example/cs_test_1')`, [orderId]);
    });

    it("treats re-attaching the same gateway session as a no-op", async () => {
      await db.as(service, `select public.attach_payment_session($1, 'stripe', 'cs_test_1', 'https://checkout.example/cs_test_1')`, [orderId]);
      const open = await db.sql(`select id from public.payments where order_id = $1 and status = 'pending'`, [orderId]);
      expect(open).toHaveLength(1);
    });

    it("cannot be confirmed or marked paid by staff without gateway evidence", async () => {
      await expect(db.as(user(admin), `select public.admin_update_order_status($1, 'confirmed')`, [orderId]))
        .rejects.toThrow(/PAYMENT_NOT_VERIFIED/);
      await expect(db.as(user(admin), `select public.admin_record_cod_payment($1, $2)`, [orderId, total]))
        .rejects.toThrow(/ONLINE_PAYMENT_REQUIRES_GATEWAY_VERIFICATION/);
    });

    it("rejects a verified event whose amount does not match", async () => {
      const [r] = await db.as<{ r: string }>(service,
        `select public.record_gateway_payment('stripe','evt_bad','checkout.session.completed',$1,'cs_test_1',$2,'PKR','succeeded') as r`,
        [orderId, total - 1]);
      expect(r.r).toBe("amount_mismatch");
      const [o] = await db.sql<Record<string, any>>(`select payment_status from public.orders where id = $1`, [orderId]);
      expect(o.payment_status).toBe("pending");
    });

    it("marks paid once and treats replays as duplicates", async () => {
      const call = `select public.record_gateway_payment('stripe','evt_ok','checkout.session.completed',$1,'cs_test_1',$2,'PKR','succeeded') as r`;
      const [first] = await db.as<{ r: string }>(service, call, [orderId, total]);
      const [replay] = await db.as<{ r: string }>(service, call, [orderId, total]);
      expect(first.r).toBe("paid");
      expect(replay.r).toBe("duplicate");
      const [o] = await db.sql<Record<string, any>>(`select status, payment_status, paid_total from public.orders where id = $1`, [orderId]);
      expect(o).toMatchObject({ status: "confirmed", payment_status: "paid" });
      expect(Number(o.paid_total)).toBe(total);
      const payments = await db.sql(`select * from public.payments where order_id = $1 and status = 'succeeded'`, [orderId]);
      expect(payments).toHaveLength(1);
    });

    it("cancels and restocks when the checkout session expires unpaid", async () => {
      const before = await stock("SLATE-GRA");
      const order = await placeOrder(bob, [{ sku: "SLATE-GRA", quantity: 1 }], { payment_method: "online" });
      await db.as(service, `select public.attach_payment_session($1, 'stripe', 'cs_test_2', null)`, [order.order_id]);
      expect(await stock("SLATE-GRA")).toBe(before - 1);
      const [r] = await db.as<{ r: string }>(service,
        `select public.record_gateway_payment('stripe','evt_exp','checkout.session.expired',$1,'cs_test_2',null,'PKR','expired') as r`,
        [order.order_id]);
      expect(r.r).toBe("cancelled");
      expect(await stock("SLATE-GRA")).toBe(before);
    });
  });
});

describe("reviews and Q&A", () => {
  it("only delivered purchases can be reviewed, and ratings aggregate", async () => {
    await expect(db.as(user(alice), `select public.submit_review((select id from public.products where slug='fog-keycap-set'), 5, 'Great', 'Lovely')`))
      .rejects.toThrow(/REVIEW_NOT_ELIGIBLE/);

    const order = await placeOrder(alice, [{ sku: "KC-FOG", quantity: 1 }]);
    for (const s of ["confirmed", "shipped", "delivered"]) {
      await db.as(user(staffOrders), `select public.admin_update_order_status($1, $2)`, [order.order_id, s]);
    }
    await db.as(user(alice), `select public.submit_review((select id from public.products where slug='fog-keycap-set'), 4, 'Good', 'Nice feel')`);
    const [p] = await db.as<{ rating_avg: string; rating_count: number }>(anon,
      `select rating_avg, rating_count from public.products where slug = 'fog-keycap-set'`);
    expect(Number(p.rating_avg)).toBe(4);
    expect(p.rating_count).toBe(1);
  });

  it("questions stay private until staff answer them", async () => {
    const [{ id }] = await db.as<{ id: string }>(user(bob),
      `select public.ask_question((select id from public.products where slug='mono-60'), 'Does it support macOS layouts?') as id`);
    expect(await db.as(anon, `select id from public.product_questions where id = $1`, [id])).toHaveLength(0);
    expect(await db.as(user(bob), `select id from public.product_questions where id = $1`, [id])).toHaveLength(1);

    await expect(db.as(user(alice), `select public.answer_question($1, 'Yes')`, [id])).rejects.toThrow(/FORBIDDEN/);
    await db.as(user(staffSupport), `select public.answer_question($1, 'Yes, there is a Mac mode switch.')`, [id]);

    const visible = await db.as<{ body: string }>(anon,
      `select a.body from public.product_answers a join public.product_questions q on q.id = a.question_id where q.id = $1`, [id]);
    expect(visible[0].body).toMatch(/Mac mode/);

    await db.as(user(staffSupport), `select public.moderate_question($1, 'spam')`, [id]);
    expect(await db.as(anon, `select id from public.product_questions where id = $1`, [id])).toHaveLength(0);
  });

  it("rate limits question spam", async () => {
    const ask = `select public.ask_question((select id from public.products where slug='mono-60'), 'Question number ' || $1)`;
    for (let i = 0; i < 5; i++) await db.as(user(alice), ask, [String(i)]);
    await expect(db.as(user(alice), ask, ["6"])).rejects.toThrow(/RATE_LIMITED/);
  });
});

describe("dashboard metrics", () => {
  it("computes gross, net, refunds and AOV from counted orders only", async () => {
    const fresh = await TestDb.create({ seed: true });
    try {
      const c = await fresh.createUser("c@example.com");
      const a = await fresh.createUser("a@example.com", "admin");
      await fresh.sql(`update public.store_settings set free_shipping_threshold = null, online_payments_enabled = true`);
      const place = async (sku: string, quantity: number, payment_method = "cod") => {
        const [v] = await fresh.sql<{ id: string }>(`select id from public.product_variants where sku = $1`, [sku]);
        const [r] = await fresh.as<{ r: any }>(user(c), `select public.place_order($1::jsonb) as r`, [JSON.stringify({
          idempotency_key: `k-${sku}-${quantity}-${payment_method}-${Math.random()}`, payment_method, shipping_method: "standard",
          contact: { name: "C", email: "c@example.com", phone: "1234567" },
          address: { full_name: "C", line1: "x", city: "Lahore" },
          items: [{ variant_id: v.id, quantity }],
        })]);
        return r.r;
      };
      const o1 = await place("KC-FOG", 2); // 17600
      const o2 = await place("MONO60", 1); // 16000
      const o3 = await place("TOOLKIT", 1); // 1800 -> cancelled
      await place("MAT-M", 1, "online"); // unpaid online: not counted
      await fresh.as(user(a), `select public.admin_update_order_status($1, 'cancelled')`, [o3.order_id]);
      await fresh.as(user(a), `select public.admin_record_cod_payment($1, $2)`, [o1.order_id, o1.total]);
      await fresh.as(user(a), `select public.admin_record_manual_refund($1, 600, 'partial')`, [o1.order_id]);
      for (const s of ["confirmed", "shipped", "delivered"]) {
        await fresh.as(user(a), `select public.admin_update_order_status($1, $2)`, [o2.order_id, s]);
      }

      const [{ r }] = await fresh.as<{ r: any }>(user(a),
        `select public.admin_sales_report(now() - interval '1 day', now() + interval '1 day') as r`);
      const s = r.summary;
      expect(Number(s.gross_sales)).toBe(17600 + 16000);
      expect(Number(s.refunds)).toBe(600);
      expect(Number(s.net_sales)).toBe(17600 + 16000 - 600);
      expect(Number(s.counted_orders)).toBe(2);
      expect(Number(s.average_order_value)).toBe((17600 + 16000) / 2);
      expect(s.total_orders).toBe(4);
      expect(s.cancelled_orders).toBe(1);
      expect(s.completed_orders).toBe(1);
      expect(s.awaiting_payment).toBe(1);
      expect(r.profit.available).toBe(true);
      expect(Number(r.profit.gross_profit)).toBe((8800 - 3900) * 2 + (16000 - 9000));
      expect(r.daily.length).toBeGreaterThanOrEqual(2);
      expect(r.top_products[0].name).toBe("Fog Keycap Set");

      await expect(fresh.as(user(c), `select public.admin_sales_report(now() - interval '1 day', now())`)).rejects.toThrow(/FORBIDDEN/);
    } finally {
      await fresh.close();
    }
  });
});
