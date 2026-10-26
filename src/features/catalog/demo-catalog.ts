// DEMO MODE ONLY. Used when no Supabase project is configured so the storefront
// (layout, animations, catalog, product pages, guest cart) can be previewed
// locally. As soon as NEXT_PUBLIC_SUPABASE_URL / key are set, every query reads
// the real database and nothing here is used. Checkout, accounts and the admin
// always require the database.
import { computeUnitPrice } from "@/lib/pricing";
import type { CartQuote, CatalogProduct, Category, OptionFacet, ProductDetail, QuoteLine, Review, StoreSettings } from "@/types/domain";
import {
  CATEGORY_DEFS,
  IMG,
  PRODUCTS,
  categoryTree,
  colorOf,
  optionNamesOf,
  productId,
  variantsOf,
  type DemoProduct,
} from "./demo-data";

const CATEGORIES: Category[] = CATEGORY_DEFS.map((c, i) => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  description: c.description,
  image_url: `${IMG}/${c.image}.webp`,
  parent_id: c.parent ? CATEGORY_DEFS.find((p) => p.slug === c.parent)!.id : null,
  is_visible: true,
  sort_order: i + 1,
}));

const NOW = Date.UTC(2026, 9, 22);
const categoryOf = (slug: string) => CATEGORIES.find((c) => c.slug === slug)!;

function toCatalog(p: DemoProduct): CatalogProduct {
  const variants = variantsOf(p);
  const unit = computeUnitPrice(p.price, p.sale ?? null, null, null);
  const cat = categoryOf(p.category);
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  return {
    id: productId(p.n),
    name: p.name,
    slug: p.slug,
    short_description: p.short,
    price: p.price,
    sale_price: p.sale ?? null,
    effective_price: unit,
    min_variant_price: unit,
    max_variant_price: unit,
    rating_avg: p.rating?.[0] ?? 0,
    rating_count: p.rating?.[1] ?? 0,
    sold_count: p.sold,
    published_at: new Date(NOW - p.daysOld * 86_400_000).toISOString(),
    category_name: cat.name,
    category_slug: cat.slug,
    image_url: `${IMG}/${p.colors[0]}.webp`,
    image_alt: p.name,
    total_stock: variants.reduce((s, v) => s + v.stock, 0),
    low_stock_threshold: 5,
    variant_count: variants.length,
    default_variant_id: firstInStock.id,
    total_count: 0,
  };
}

export function demoCategories(): Category[] {
  return CATEGORIES;
}

export function demoSearch(args: {
  q?: string | null;
  category?: string | null;
  min?: number | null;
  max?: number | null;
  sort?: string;
  inStock?: boolean;
  featured?: boolean;
  options?: Record<string, string[]>;
  limit: number;
  offset: number;
}): CatalogProduct[] {
  const terms = (args.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const tree = args.category ? categoryTree(args.category) : null;
  const wanted = Object.entries(args.options ?? {}).filter(([, values]) => values.length > 0);
  let rows = PRODUCTS.filter((p) => {
    const text = `${p.name} ${p.short} ${p.description}`.toLowerCase();
    const variants = wanted.length ? variantsOf(p) : [];
    return (
      (!tree || tree.has(p.category)) &&
      (!args.featured || p.featured) &&
      terms.every((t) => text.split(/[^a-z0-9]+/).some((w) => w.startsWith(t))) &&
      wanted.every(([name, values]) => variants.some((v) => values.includes(v.options[name])))
    );
  }).map(toCatalog);
  rows = rows.filter(
    (r) =>
      (args.min == null || r.min_variant_price >= args.min) &&
      (args.max == null || r.min_variant_price <= args.max) &&
      (!args.inStock || r.total_stock > 0),
  );
  const by: Record<string, (a: CatalogProduct, b: CatalogProduct) => number> = {
    price_asc: (a, b) => a.min_variant_price - b.min_variant_price,
    price_desc: (a, b) => b.min_variant_price - a.min_variant_price,
    popular: (a, b) => b.sold_count - a.sold_count,
    rating: (a, b) => b.rating_avg - a.rating_avg,
  };
  rows.sort(by[args.sort ?? ""] ?? ((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")));
  const total = rows.length;
  return rows.slice(args.offset, args.offset + args.limit).map((r) => ({ ...r, total_count: total }));
}

/** Option values (size, colour, phone model…) offered by products in a category, with product counts. */
export function demoOptionFacets(category: string | null): OptionFacet[] {
  const tree = category ? categoryTree(category) : null;
  const counts = new Map<string, Map<string, number>>();
  for (const p of PRODUCTS) {
    if (tree && !tree.has(p.category)) continue;
    const seen = new Set<string>();
    for (const v of variantsOf(p)) {
      for (const [name, value] of Object.entries(v.options)) {
        const key = `${name}\u0000${value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const byValue = counts.get(name) ?? new Map<string, number>();
        byValue.set(value, (byValue.get(value) ?? 0) + 1);
        counts.set(name, byValue);
      }
    }
  }
  return [...counts].map(([name, values]) => ({ name, values: [...values].map(([value, count]) => ({ value, count })) }));
}

export function demoProductBySlug(slug: string): ProductDetail | null {
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return null;
  const variants = variantsOf(p);
  const cat = categoryOf(p.category);
  const optionNames = optionNamesOf(p);
  return {
    id: productId(p.n),
    name: p.name,
    slug: p.slug,
    short_description: p.short,
    description: p.description,
    specifications: p.specs.map(([label, value]) => ({ label, value })),
    option_names: optionNames,
    price: p.price,
    sale_price: p.sale ?? null,
    status: "active",
    is_featured: Boolean(p.featured),
    low_stock_threshold: 5,
    rating_avg: p.rating?.[0] ?? 0,
    rating_count: p.rating?.[1] ?? 0,
    category: { id: cat.id, name: cat.name, slug: cat.slug },
    images: p.colors.map((c, i) => ({ id: `${productId(p.n)}-img-${i}`, url: `${IMG}/${c}.webp`, alt: `${p.name} in ${colorOf(c)}`, position: i })),
    variants: variants.map((v) => ({
      id: v.id,
      product_id: productId(p.n),
      sku: `DEMO-${p.n}-${v.position}`,
      title: v.title,
      options: v.options,
      price: null,
      sale_price: null,
      is_active: true,
      position: v.position,
    })),
  };
}

export function demoStock(id: string): Record<string, number> {
  const p = PRODUCTS.find((x) => productId(x.n) === id);
  return p ? Object.fromEntries(variantsOf(p).map((v) => [v.id, v.stock])) : {};
}

const REVIEW_SNIPPETS: [string, string, number, string, string][] = [
  ["Ayesha", "essential-cotton-tee", 5, "My new favourite tee", "Thick fabric, great fit and it hasn't shrunk at all after several washes."],
  ["Hamza", "leather-crossbody-bag", 5, "Beautiful leather", "The tan colour is even better in person and the clasp feels solid."],
  ["Sara", "oversized-fleece-hoodie", 5, "So cosy", "Perfect oversized fit. I ordered my usual size and it's exactly what I wanted."],
  ["Bilal", "everyday-leather-sneakers", 4, "Comfortable all day", "Clean look and very comfortable. Took a couple of days to break in."],
  ["Mariam", "canvas-market-tote", 5, "Holds everything", "Fits my laptop, water bottle and groceries. Handles are really sturdy."],
  ["Zainab", "linen-summer-dress", 5, "Lovely for summer", "Light, breathable and the pockets are a bonus."],
];

export function demoRecentReviews(): (Review & { product: { name: string; slug: string } | null })[] {
  return REVIEW_SNIPPETS.map(([author, slug, rating, title, body], i) => ({
    id: `demo-review-${i}`,
    author_name: author,
    rating,
    title,
    body,
    created_at: new Date(NOW - (i + 1) * 3 * 86_400_000).toISOString(),
    product: { name: PRODUCTS.find((p) => p.slug === slug)!.name, slug },
  }));
}

export function demoProductReviews(id: string): Review[] {
  const p = PRODUCTS.find((x) => productId(x.n) === id);
  return demoRecentReviews()
    .filter((r) => r.product?.slug === p?.slug)
    .map((r) => ({ id: r.id, author_name: r.author_name, rating: r.rating, title: r.title, body: r.body, created_at: r.created_at }));
}

export function demoSitemap() {
  return PRODUCTS.map((p) => ({ slug: p.slug, updated_at: new Date(NOW).toISOString() }));
}

const SHIPPING = [
  { id: "standard", label: "Standard delivery", price: 250, eta: "3–5 business days" },
  { id: "express", label: "Express delivery", price: 600, eta: "1–2 business days" },
];
const FREE_SHIPPING = 10000;

export const DEMO_SETTINGS: Partial<StoreSettings> = {
  tagline: "Everything you need, in one place.",
  contactEmail: "hello@example.com",
  contactPhone: "+92 300 0000000",
  contactAddress: "Lahore, Pakistan",
  shippingMethods: SHIPPING,
  freeShippingThreshold: FREE_SHIPPING,
  newsletterEnabled: true,
  hero: {
    title: "Wear the moment. Carry it well.",
    subtitle: "Leather jackets, belts, shoes, watches and mobile accessories, chosen to be used every day and kept for years.",
    cta_label: "Shop collection",
    cta_href: "/products",
    image_url: `${IMG}/hero.webp`,
  },
  promo: {
    eyebrow: "New season",
    title: "The quilted bag is back.",
    body: "Diamond-quilted, gold-tone chain, made in small batches. Limited stock in black and cream.",
    cta_label: "Shop handbags",
    cta_href: "/categories/handbags",
    image_url: `${IMG}/promo.webp`,
  },
  policies: {
    shipping: "Demo store: orders are dispatched within 2 business days.",
    returns: "Demo store: unworn items can be returned within 7 days.",
    privacy: "Demo store: no data is stored while the database is not connected.",
    terms: "Demo store: prices are examples.",
  },
};

/** Prices a guest cart from the demo catalog (mirrors quote_cart's rules). */
export function demoQuote(entries: { variantId: string; quantity: number }[], shippingMethod: string | null): CartQuote {
  const lines: QuoteLine[] = [];
  let subtotal = 0;
  let items = 0;
  let issues = 0;
  for (const e of entries) {
    const p = PRODUCTS.find((x) => variantsOf(x).some((v) => v.id === e.variantId));
    const v = p ? variantsOf(p).find((x) => x.id === e.variantId)! : null;
    if (!p || !v) {
      issues++;
      lines.push({ variant_id: e.variantId, product_id: null, product_name: "Unavailable item", product_slug: null, variant_title: null, options: {}, sku: null, image_url: null, unit_price: null, compare_at_price: null, quantity: e.quantity, line_total: 0, available_quantity: 0, issue: "unavailable" });
      continue;
    }
    const unit = computeUnitPrice(p.price, p.sale ?? null, null, null);
    const issue = v.stock === 0 ? "out_of_stock" : v.stock < e.quantity ? "insufficient_stock" : null;
    if (issue) issues++;
    else {
      subtotal += unit * e.quantity;
      items += e.quantity;
    }
    lines.push({
      variant_id: v.id, product_id: productId(p.n), product_name: p.name, product_slug: p.slug, variant_title: v.title,
      options: v.options, sku: `DEMO-${p.n}-${v.position}`, image_url: v.image, unit_price: unit, compare_at_price: p.price,
      quantity: e.quantity, line_total: issue ? 0 : unit * e.quantity, available_quantity: v.stock, issue,
    });
  }
  const free = subtotal >= FREE_SHIPPING;
  const methods = SHIPPING.map((m) => ({ ...m, price: free ? 0 : m.price }));
  const method = methods.find((m) => m.id === shippingMethod) ?? methods[0];
  const shipping = items === 0 ? 0 : method.price;
  return {
    currency: "PKR", lines, item_count: items, issue_count: issues, subtotal, discount_total: 0, shipping_total: shipping,
    tax_total: 0, total: subtotal + shipping, shipping_method: method, shipping_methods: methods,
    free_shipping_threshold: FREE_SHIPPING, coupon: null,
  };
}
