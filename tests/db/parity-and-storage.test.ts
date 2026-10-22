import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeUnitPrice } from "@/lib/pricing";
import { NEXT_STATUSES } from "@/features/admin/orders";
import { TestDb, anon, user } from "./harness";

let db: TestDb;

beforeAll(async () => {
  db = await TestDb.create();
});
afterAll(async () => {
  await db?.close();
});

describe("price parity between the database and the storefront display", () => {
  const values = [null, 0, 500, 999.99, 1000, 1500];
  const cases: [number, number | null, number | null, number | null][] = [];
  for (const pPrice of [1000, 2500.5]) {
    for (const pSale of values) for (const vPrice of values) for (const vSale of values) cases.push([pPrice, pSale, vPrice, vSale]);
  }

  it(`agrees on all ${cases.length} combinations`, async () => {
    const rows = await db.sql<{ i: number; price: string }>(
      `select i, public.compute_unit_price((c->>0)::numeric, (c->>1)::numeric, (c->>2)::numeric, (c->>3)::numeric)::text as price
       from jsonb_array_elements($1::jsonb) with ordinality as t(c, i)`,
      [JSON.stringify(cases)],
    );
    const mismatches = rows.filter((r) => {
      const [a, b, c, d] = cases[Number(r.i) - 1];
      return Number(r.price) !== computeUnitPrice(a, b, c, d);
    });
    expect(mismatches).toEqual([]);
  });
});

describe("order status machine parity", () => {
  it("the admin's transition map matches order_transition_allowed()", async () => {
    const statuses = Object.keys(NEXT_STATUSES) as (keyof typeof NEXT_STATUSES)[];
    const pairs = statuses.flatMap((from) => statuses.map((to) => [from, to]));
    const rows = await db.sql<{ f: string; t: string; ok: boolean }>(
      `select p->>0 as f, p->>1 as t, public.order_transition_allowed(p->>0, p->>1) as ok
       from jsonb_array_elements($1::jsonb) p`,
      [JSON.stringify(pairs)],
    );
    const mismatches = rows.filter((r) => r.ok !== NEXT_STATUSES[r.f as keyof typeof NEXT_STATUSES].includes(r.t as never));
    expect(mismatches).toEqual([]);
  });
});

describe("storage policies for catalog images", () => {
  let productStaff: string;
  let settingsStaff: string;
  let customer: string;

  beforeAll(async () => {
    productStaff = await db.createUser("p@example.com", "staff", ["products"]);
    settingsStaff = await db.createUser("s@example.com", "staff", ["settings"]);
    customer = await db.createUser("c@example.com");
  });

  const insert = (path: string) => `insert into storage.objects (bucket_id, name) values ('catalog', '${path}') returning name`;

  it("configures a public bucket limited to images up to 5 MB", async () => {
    const [bucket] = await db.sql<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(
      `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'catalog'`,
    );
    expect(bucket.public).toBe(true);
    expect(Number(bucket.file_size_limit)).toBe(5 * 1024 * 1024);
    expect(bucket.allowed_mime_types).toEqual(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  });

  it("lets product staff upload product images but not store assets", async () => {
    expect(await db.as(user(productStaff), insert("products/abc/1.webp"))).toHaveLength(1);
    await expect(db.as(user(productStaff), insert("store/logo.png"))).rejects.toThrow(/row-level security/);
  });

  it("lets settings staff upload store assets only", async () => {
    expect(await db.as(user(settingsStaff), insert("store/logo.png"))).toHaveLength(1);
    await expect(db.as(user(settingsStaff), insert("products/abc/2.webp"))).rejects.toThrow(/row-level security/);
  });

  it("blocks customers and anonymous visitors from uploading", async () => {
    await expect(db.as(user(customer), insert("products/abc/3.webp"))).rejects.toThrow(/row-level security/);
    await expect(db.as(anon, insert("products/abc/4.webp"))).rejects.toThrow(/permission denied|row-level security/);
  });
});
