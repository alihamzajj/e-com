import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/config/public";
import {
  demoCategories,
  demoProductBySlug,
  demoProductReviews,
  demoRecentReviews,
  demoSearch,
  demoSitemap,
  demoStock,
} from "./demo-catalog";
import { logServerError } from "@/lib/errors";
import { toNumber } from "@/lib/utils/format";
import type { CatalogProduct, Category, ProductDetail, ProductVariant, Review } from "@/types/domain";

export const PAGE_SIZE = 12;
export const SORTS = ["newest", "price_asc", "price_desc", "popular", "rating", "relevance"] as const;
export type CatalogSort = (typeof SORTS)[number];

export type CatalogParams = {
  q: string | null;
  category: string | null;
  min: number | null;
  max: number | null;
  sort: CatalogSort;
  inStock: boolean;
  page: number;
};

export type CatalogResult = { products: CatalogProduct[]; total: number; page: number; pageCount: number };

type SearchParamValue = string | string[] | undefined;

function first(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: SearchParamValue): number | null {
  const raw = first(value);
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Normalises untrusted URL search params into catalog filters. */
export function parseCatalogParams(sp: Record<string, SearchParamValue>, fixedCategory?: string): CatalogParams {
  const q = first(sp.q)?.trim().slice(0, 100) || null;
  const sortRaw = first(sp.sort) as CatalogSort | undefined;
  const sort: CatalogSort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : q ? "relevance" : "newest";
  const pageRaw = Number(first(sp.page));
  const category = fixedCategory ?? (first(sp.category)?.match(/^[a-z0-9-]{1,80}$/)?.[0] || null);
  return {
    q,
    category,
    min: positiveNumber(sp.min),
    max: positiveNumber(sp.max),
    sort,
    inStock: first(sp.stock) === "1",
    page: Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 10_000 ? pageRaw : 1,
  };
}

export function catalogQueryString(params: Partial<CatalogParams>, overrides: Partial<CatalogParams> = {}, omitCategory = false) {
  const p = { ...params, ...overrides };
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.category && !omitCategory) qs.set("category", p.category);
  if (p.min != null) qs.set("min", String(p.min));
  if (p.max != null) qs.set("max", String(p.max));
  if (p.sort && p.sort !== "newest" && !(p.sort === "relevance" && p.q)) qs.set("sort", p.sort);
  if (p.inStock) qs.set("stock", "1");
  if (p.page && p.page > 1) qs.set("page", String(p.page));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function mapCatalogRow(row: Record<string, unknown>): CatalogProduct {
  const r = row as unknown as CatalogProduct;
  return {
    ...r,
    price: toNumber(r.price),
    sale_price: r.sale_price == null ? null : toNumber(r.sale_price),
    effective_price: toNumber(r.effective_price),
    min_variant_price: toNumber(r.min_variant_price),
    max_variant_price: toNumber(r.max_variant_price),
    rating_avg: toNumber(r.rating_avg),
    rating_count: toNumber(r.rating_count),
    sold_count: toNumber(r.sold_count),
    total_stock: toNumber(r.total_stock),
    low_stock_threshold: toNumber(r.low_stock_threshold),
    variant_count: toNumber(r.variant_count),
    total_count: toNumber(r.total_count),
  };
}

async function runCatalogSearch(args: {
  q?: string | null;
  category?: string | null;
  min?: number | null;
  max?: number | null;
  sort?: CatalogSort;
  inStock?: boolean;
  featured?: boolean;
  limit: number;
  offset: number;
}): Promise<CatalogProduct[]> {
  if (!isSupabaseConfigured()) return demoSearch(args);
  const { data, error } = await createPublicClient().rpc("catalog_search", {
    p_query: args.q ?? null,
    p_category_slug: args.category ?? null,
    p_min_price: args.min ?? null,
    p_max_price: args.max ?? null,
    p_sort: args.sort ?? "newest",
    p_in_stock: args.inStock ?? false,
    p_featured: args.featured ?? false,
    p_limit: args.limit,
    p_offset: args.offset,
  });
  if (error) {
    logServerError("catalog.search", error);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapCatalogRow);
}

/** Paginated, filtered catalog. Cached briefly; checkout re-validates price and stock. */
export async function searchCatalog(params: CatalogParams): Promise<CatalogResult> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");
  const products = await runCatalogSearch({
    ...params,
    limit: PAGE_SIZE,
    offset: (params.page - 1) * PAGE_SIZE,
  });
  const total = products[0]?.total_count ?? 0;
  return { products, total, page: params.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProductRail(kind: "featured" | "newest" | "popular", limit = 8): Promise<CatalogProduct[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");
  return runCatalogSearch({
    featured: kind === "featured",
    sort: kind === "popular" ? "popular" : "newest",
    limit,
    offset: 0,
  });
}

export async function getRelatedProducts(categorySlug: string | null, excludeId: string, limit = 4): Promise<CatalogProduct[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");
  const rows = await runCatalogSearch({ category: categorySlug, sort: "popular", limit: limit + 1, offset: 0 });
  const related = rows.filter((p) => p.id !== excludeId).slice(0, limit);
  if (related.length > 0 || !categorySlug) return related;
  return (await runCatalogSearch({ sort: "popular", limit: limit + 1, offset: 0 })).filter((p) => p.id !== excludeId).slice(0, limit);
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("hours");
  if (!isSupabaseConfigured()) return demoCategories();
  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, parent_id, name, slug, description, image_url, is_visible, sort_order")
    .eq("is_visible", true)
    .order("sort_order")
    .order("name");
  if (error) {
    logServerError("catalog.categories", error);
    return [];
  }
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

type ProductRow = Omit<ProductDetail, "images" | "variants" | "category"> & {
  category: ProductDetail["category"];
  product_images: ProductDetail["images"];
  product_variants: (ProductDetail["variants"][number] & { is_active: boolean })[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag("products", `product:${slug}`);
  cacheLife("minutes");
  if (!isSupabaseConfigured()) return demoProductBySlug(slug);
  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      `id, name, slug, short_description, description, specifications, option_names, price, sale_price, status,
       is_featured, low_stock_threshold, rating_avg, rating_count,
       category:categories(id, name, slug),
       product_images(id, url, alt, position),
       product_variants(id, product_id, sku, title, options, price, sale_price, is_active, position)`,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    logServerError("catalog.product", error);
    return null;
  }
  if (!data) return null;
  const row = data as unknown as ProductRow;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    short_description: row.short_description,
    description: row.description,
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
    option_names: row.option_names ?? [],
    price: toNumber(row.price),
    sale_price: row.sale_price == null ? null : toNumber(row.sale_price),
    status: row.status,
    is_featured: row.is_featured,
    low_stock_threshold: toNumber(row.low_stock_threshold),
    rating_avg: toNumber(row.rating_avg),
    rating_count: toNumber(row.rating_count),
    category: row.category ?? null,
    images: [...(row.product_images ?? [])].sort((a, b) => a.position - b.position),
    variants: (row.product_variants ?? [])
      .filter((v) => v.is_active)
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        ...v,
        options: v.options ?? {},
        price: v.price == null ? null : toNumber(v.price),
        sale_price: v.sale_price == null ? null : toNumber(v.sale_price),
      })),
  };
}

/** Live stock levels — intentionally uncached; call inside a Suspense boundary. */
export async function getVariantStock(productId: string): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return demoStock(productId);
  const { data, error } = await createPublicClient()
    .from("product_variants")
    .select("id, stock_quantity")
    .eq("product_id", productId)
    .eq("is_active", true);
  if (error) {
    logServerError("catalog.stock", error);
    return {};
  }
  return Object.fromEntries(((data ?? []) as Pick<ProductVariant, "id" | "stock_quantity">[]).map((v) => [v.id, v.stock_quantity]));
}

export async function getProductReviews(productId: string, limit = 20): Promise<Review[]> {
  "use cache";
  cacheTag("reviews", `reviews:${productId}`);
  cacheLife("minutes");
  if (!isSupabaseConfigured()) return demoProductReviews(productId);
  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, author_name, rating, title, body, created_at")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logServerError("catalog.reviews", error);
    return [];
  }
  return (data ?? []) as Review[];
}

export type HomeReview = Review & { product: { name: string; slug: string } | null };

export async function getRecentReviews(limit = 6): Promise<HomeReview[]> {
  "use cache";
  cacheTag("reviews");
  cacheLife("hours");
  if (!isSupabaseConfigured()) return demoRecentReviews();
  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, author_name, rating, title, body, created_at, product:products(name, slug)")
    .eq("status", "published")
    .gte("rating", 4)
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logServerError("catalog.recent_reviews", error);
    return [];
  }
  return (data ?? []) as unknown as HomeReview[];
}

export type PublicQuestion = {
  id: string;
  parent_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
  answers: { id: string; author_name: string; body: string; created_at: string }[];
  followUps: PublicQuestion[];
};

/** Answered questions with their answers and answered follow-ups. */
export async function getAnsweredQuestions(productId: string): Promise<PublicQuestion[]> {
  "use cache";
  cacheTag(`questions:${productId}`);
  cacheLife("minutes");
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from("product_questions")
    .select("id, parent_id, author_name, body, created_at, product_answers(id, author_name, body, created_at)")
    .eq("product_id", productId)
    .eq("status", "answered")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    logServerError("catalog.questions", error);
    return [];
  }
  type Row = Omit<PublicQuestion, "answers" | "followUps"> & { product_answers: PublicQuestion["answers"] };
  const rows = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    parent_id: r.parent_id,
    author_name: r.author_name,
    body: r.body,
    created_at: r.created_at,
    answers: [...(r.product_answers ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    followUps: [] as PublicQuestion[],
  }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const roots: PublicQuestion[] = [];
  for (const r of rows) {
    if (r.parent_id && byId.has(r.parent_id)) byId.get(r.parent_id)!.followUps.push(r);
    else if (!r.parent_id) roots.push(r);
  }
  for (const r of roots) r.followUps.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return roots;
}

export async function getSitemapProducts(): Promise<{ slug: string; updated_at: string }[]> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  if (!isSupabaseConfigured()) return demoSitemap();
  const { data } = await createPublicClient()
    .from("products")
    .select("slug, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(5000);
  return (data ?? []) as { slug: string; updated_at: string }[];
}
