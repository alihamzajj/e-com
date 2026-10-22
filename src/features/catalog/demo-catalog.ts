// DEMO MODE ONLY. Used when no Supabase project is configured so the storefront
// (layout, animations, catalog, product pages, guest cart) can be previewed
// locally. As soon as NEXT_PUBLIC_SUPABASE_URL / key are set, every query reads
// the real database and nothing here is used. Checkout, accounts and the admin
// always require the database.
import { computeUnitPrice } from "@/lib/pricing";
import type { CartQuote, CatalogProduct, Category, ProductDetail, QuoteLine, Review, StoreSettings } from "@/types/domain";

const IMG = "/demo/fashion";

type DemoProduct = {
  n: number;
  name: string;
  slug: string;
  category: string;
  short: string;
  description: string;
  price: number;
  sale?: number;
  featured?: boolean;
  colors: string[]; // image key suffix per colour, e.g. "tee-white"
  sizes?: string[];
  stock: number[]; // cycled across variants
  rating?: [number, number];
  sold: number;
  specs: [string, string][];
  daysOld: number;
};

const CATEGORIES: Category[] = [
  { id: "c1", slug: "clothing", name: "Clothing", description: "Everyday essentials and seasonal pieces.", image_url: `${IMG}/category-clothing.webp` },
  { id: "c2", slug: "handbags", name: "Handbags", description: "Totes, crossbody and evening bags.", image_url: `${IMG}/category-handbags.webp` },
  { id: "c3", slug: "shoes", name: "Shoes", description: "Sneakers and loafers made to be worn daily.", image_url: `${IMG}/category-shoes.webp` },
  { id: "c4", slug: "accessories", name: "Accessories", description: "Scarves, caps and belts.", image_url: `${IMG}/category-accessories.webp` },
].map((c, i) => ({
  ...c,
  id: `00000000-0000-4000-8000-0000000000c${i + 1}`,
  parent_id: null,
  is_visible: true,
  sort_order: i + 1,
}));

const APPAREL = ["S", "M", "L", "XL"];

const PRODUCTS: DemoProduct[] = [
  { n: 1, name: "Essential Cotton Tee", slug: "essential-cotton-tee", category: "clothing", short: "Heavyweight organic cotton tee with a relaxed fit.", description: "Cut from 240 gsm organic cotton with a soft enzyme wash. Dropped shoulders, ribbed collar and a boxy, relaxed fit that keeps its shape after every wash.", price: 2490, featured: true, colors: ["tee-white", "tee-black", "tee-sage"], sizes: APPAREL, stock: [24, 18, 9, 4], rating: [4.7, 38], sold: 212, specs: [["Material", "100% organic cotton, 240 gsm"], ["Fit", "Relaxed"], ["Care", "Machine wash cold"]], daysOld: 40 },
  { n: 2, name: "Oversized Fleece Hoodie", slug: "oversized-fleece-hoodie", category: "clothing", short: "Brushed-back fleece hoodie with a double-layer hood.", description: "A cosy oversized hoodie in brushed-back cotton fleece with a kangaroo pocket, flat drawcords and a double-layer hood.", price: 6990, sale: 5490, featured: true, colors: ["hoodie-grey", "hoodie-black"], sizes: APPAREL, stock: [12, 7, 3, 0], rating: [4.8, 51], sold: 164, specs: [["Material", "80% cotton, 20% polyester"], ["Weight", "380 gsm"], ["Fit", "Oversized"]], daysOld: 25 },
  { n: 3, name: "Linen Summer Dress", slug: "linen-summer-dress", category: "clothing", short: "Breathable linen midi dress with adjustable straps.", description: "Washed European linen in a flowing A-line midi. Adjustable straps, a fitted bodice and side pockets.", price: 8900, featured: true, colors: ["dress-sand", "dress-terracotta"], sizes: ["S", "M", "L"], stock: [6, 10, 2], rating: [4.6, 22], sold: 98, specs: [["Material", "100% linen"], ["Length", "Midi"], ["Care", "Hand wash"]], daysOld: 6 },
  { n: 4, name: "Denim Trucker Jacket", slug: "denim-trucker-jacket", category: "clothing", short: "Classic rigid denim jacket with chest pockets.", description: "A timeless trucker jacket in 13 oz rigid denim that softens with wear. Button front, two chest pockets, adjustable waist tabs.", price: 11500, colors: ["jacket-indigo"], sizes: ["M", "L", "XL"], stock: [5, 8, 3], rating: [4.5, 17], sold: 61, specs: [["Material", "13 oz cotton denim"], ["Fit", "Regular"]], daysOld: 70 },
  { n: 5, name: "Wide-Leg Trousers", slug: "wide-leg-trousers", category: "clothing", short: "High-rise tailored trousers with a fluid drape.", description: "Tailored wide-leg trousers with a high rise, front pleats and a soft drape that works from office to evening.", price: 5990, colors: ["trousers-black", "trousers-beige"], sizes: ["S", "M", "L"], stock: [9, 11, 6], rating: [4.4, 12], sold: 47, specs: [["Material", "Viscose blend"], ["Rise", "High"]], daysOld: 3 },
  { n: 6, name: "Chunky Knit Cardigan", slug: "chunky-knit-cardigan", category: "clothing", short: "Soft wool-blend cardigan with horn-effect buttons.", description: "A slouchy V-neck cardigan knitted from a soft wool blend, finished with horn-effect buttons and ribbed cuffs.", price: 7400, sale: 6200, colors: ["cardigan-cream"], sizes: APPAREL, stock: [4, 6, 2, 1], rating: [4.9, 14], sold: 39, specs: [["Material", "50% wool, 50% acrylic"]], daysOld: 12 },
  { n: 7, name: "Canvas Market Tote", slug: "canvas-market-tote", category: "handbags", short: "Sturdy waxed-canvas tote with an inner pocket.", description: "Roomy enough for a laptop and the day's shopping. Waxed cotton canvas, reinforced handles and an inner zip pocket.", price: 3200, featured: true, colors: ["tote-natural", "tote-black"], stock: [30, 22], rating: [4.6, 44], sold: 230, specs: [["Material", "Waxed cotton canvas"], ["Size", "42 × 38 × 12 cm"]], daysOld: 55 },
  { n: 8, name: "Leather Crossbody Bag", slug: "leather-crossbody-bag", category: "handbags", short: "Full-grain leather crossbody with a brass clasp.", description: "A compact crossbody in full-grain leather with an adjustable strap, magnetic brass clasp and two inner compartments.", price: 12900, sale: 10900, featured: true, colors: ["crossbody-tan", "crossbody-black", "crossbody-ember"], stock: [8, 5, 3], rating: [4.8, 63], sold: 187, specs: [["Material", "Full-grain leather"], ["Strap", "Adjustable, 110–130 cm"]], daysOld: 18 },
  { n: 9, name: "Quilted Chain Shoulder Bag", slug: "quilted-chain-shoulder-bag", category: "handbags", short: "Diamond-quilted shoulder bag on a gold-tone chain.", description: "Soft diamond-quilted lambskin-effect leather with a gold-tone chain strap and turn-lock closure.", price: 15500, colors: ["quilted-black", "quilted-cream"], stock: [4, 6], rating: [4.7, 29], sold: 76, specs: [["Material", "Quilted vegan leather"], ["Closure", "Turn-lock"]], daysOld: 2 },
  { n: 10, name: "Evening Clutch", slug: "evening-clutch", category: "handbags", short: "Slim envelope clutch for evenings out.", description: "A slim envelope clutch with a satin lining and a detachable wrist strap.", price: 6800, colors: ["clutch-gold", "clutch-black"], stock: [2, 3], rating: [4.5, 9], sold: 31, specs: [["Size", "28 × 15 cm"]], daysOld: 30 },
  { n: 11, name: "Mini Bucket Bag", slug: "mini-bucket-bag", category: "handbags", short: "Drawstring bucket bag in ember leather.", description: "A playful mini bucket bag with a drawstring top and top handle. Restocking soon.", price: 9200, colors: ["bucket-ember"], stock: [0], rating: [4.9, 11], sold: 54, specs: [["Material", "Pebbled leather"]], daysOld: 15 },
  { n: 12, name: "Everyday Leather Sneakers", slug: "everyday-leather-sneakers", category: "shoes", short: "Minimal leather sneakers on a cushioned sole.", description: "Clean leather uppers, a padded collar and a cushioned rubber cupsole built for all-day wear.", price: 13900, featured: true, colors: ["sneaker-white", "sneaker-black"], sizes: ["40", "41", "42", "43", "44"], stock: [5, 8, 10, 6, 2], rating: [4.7, 58], sold: 143, specs: [["Upper", "Full-grain leather"], ["Sole", "Rubber cupsole"]], daysOld: 8 },
  { n: 13, name: "Suede Penny Loafers", slug: "suede-penny-loafers", category: "shoes", short: "Soft suede loafers with a hand-stitched apron.", description: "Unlined suede loafers with a hand-stitched apron toe and a flexible leather sole.", price: 11200, colors: ["loafer-brown"], sizes: ["40", "41", "42", "43"], stock: [3, 4, 4, 1], rating: [4.4, 16], sold: 40, specs: [["Upper", "Suede"]], daysOld: 90 },
  { n: 14, name: "Wool Blend Scarf", slug: "wool-blend-scarf", category: "accessories", short: "Oversized brushed scarf with fringed ends.", description: "An oversized brushed wool-blend scarf, soft enough to wear all winter.", price: 3900, sale: 3200, colors: ["scarf-camel", "scarf-grey"], stock: [14, 9], rating: [4.6, 21], sold: 88, specs: [["Size", "200 × 60 cm"]], daysOld: 20 },
  { n: 15, name: "Classic Baseball Cap", slug: "classic-baseball-cap", category: "accessories", short: "Six-panel cotton twill cap with an adjustable strap.", description: "Washed cotton twill, curved brim and an adjustable brass buckle strap.", price: 2200, colors: ["cap-black", "cap-ember"], stock: [25, 12], rating: [4.3, 19], sold: 120, specs: [["Material", "Cotton twill"]], daysOld: 1 },
  { n: 16, name: "Leather Dress Belt", slug: "leather-dress-belt", category: "accessories", short: "Vegetable-tanned leather belt with a brass buckle.", description: "A 3 cm vegetable-tanned leather belt with a solid brass buckle that ages beautifully.", price: 3400, colors: ["belt-brown", "belt-black"], sizes: ["30", "32", "34", "36"], stock: [6, 8, 7, 3], rating: [4.5, 13], sold: 66, specs: [["Width", "3 cm"], ["Material", "Vegetable-tanned leather"]], daysOld: 48 },
];

const COLOR_LABELS: Record<string, string> = {
  white: "White", black: "Black", sage: "Sage", grey: "Grey", sand: "Sand", terracotta: "Terracotta", indigo: "Indigo",
  beige: "Beige", cream: "Cream", natural: "Natural", tan: "Tan", ember: "Ember", gold: "Gold", brown: "Brown", camel: "Camel",
};

const hex = (n: number, width = 12) => n.toString(16).padStart(width, "0");
const productId = (n: number) => `00000000-0000-4000-8000-${hex(n)}`;
const variantId = (n: number, i: number) => `00000000-0000-4000-9000-${hex(n * 100 + i)}`;
const colorOf = (key: string) => COLOR_LABELS[key.split("-")[1]] ?? key;

type DemoVariant = { id: string; title: string; options: Record<string, string>; stock: number; position: number; image: string };

function variantsOf(p: DemoProduct): DemoVariant[] {
  const out: DemoVariant[] = [];
  let i = 0;
  for (const c of p.colors) {
    for (const size of p.sizes ?? [null]) {
      const options: Record<string, string> = {};
      if (p.colors.length > 1) options.Color = colorOf(c);
      if (size) options.Size = size;
      out.push({
        id: variantId(p.n, i),
        title: Object.values(options).join(" / ") || "Default",
        options,
        stock: p.stock[i % p.stock.length],
        position: i,
        image: `${IMG}/${c}.webp`,
      });
      i++;
    }
  }
  return out;
}

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
  limit: number;
  offset: number;
}): CatalogProduct[] {
  const terms = (args.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  let rows = PRODUCTS.filter((p) => {
    const text = `${p.name} ${p.short} ${p.description}`.toLowerCase();
    return (
      (!args.category || p.category === args.category) &&
      (!args.featured || p.featured) &&
      terms.every((t) => text.split(/[^a-z0-9]+/).some((w) => w.startsWith(t)))
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

export function demoProductBySlug(slug: string): ProductDetail | null {
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return null;
  const variants = variantsOf(p);
  const cat = categoryOf(p.category);
  const optionNames = [...(p.colors.length > 1 ? ["Color"] : []), ...(p.sizes ? ["Size"] : [])];
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
  tagline: "Considered clothing and leather goods for every day.",
  contactEmail: "hello@example.com",
  contactPhone: "+92 300 0000000",
  contactAddress: "Lahore, Pakistan",
  shippingMethods: SHIPPING,
  freeShippingThreshold: FREE_SHIPPING,
  newsletterEnabled: true,
  hero: {
    title: "Wear the moment. Carry it well.",
    subtitle: "Everyday clothing, leather bags and shoes, designed to be worn often and kept for years.",
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
