import Link from "next/link";
import { Suspense } from "react";
import { Package, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { buildHref, pageParam, safeSearch, searchParam } from "@/features/admin/guard";
import { FilterBar, FilterField, filterInput, ProductStatusBadge, TableSkeleton } from "@/components/admin/common";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeading } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Products" };

const PAGE_SIZE = 20;

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  price: number;
  sale_price: number | null;
  is_featured: boolean;
  low_stock_threshold: number;
  updated_at: string;
  category: { name: string } | null;
  product_variants: { stock_quantity: number; is_active: boolean }[];
  product_images: { url: string; position: number }[];
};

async function lowStockProductIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variants")
    .select("product_id, stock_quantity, is_active, products!inner(low_stock_threshold)")
    .eq("is_active", true)
    .limit(5000);
  type V = { product_id: string; stock_quantity: number; products: { low_stock_threshold: number } };
  return [...new Set(((data ?? []) as unknown as V[]).filter((v) => v.stock_quantity <= v.products.low_stock_threshold).map((v) => v.product_id))];
}

async function ProductList({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  await requirePermission("products");
  const sp = await searchParams;
  const settings = await getStoreSettings();
  const supabase = await createClient();
  const q = safeSearch(searchParam(sp, "q"));
  const status = searchParam(sp, "status");
  const category = searchParam(sp, "category");
  const stock = searchParam(sp, "stock");
  const page = pageParam(sp);

  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order").order("name");

  let query = supabase
    .from("products")
    .select(
      "id, name, slug, status, price, sale_price, is_featured, low_stock_threshold, updated_at, category:categories(name), product_variants(stock_quantity, is_active), product_images(url, position)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  if (status && ["draft", "active", "archived"].includes(status)) query = query.eq("status", status);
  if (category) query = category === "none" ? query.is("category_id", null) : query.eq("category_id", category);
  if (stock === "low") {
    const ids = await lowStockProductIds();
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const current = { q, status, category, stock };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={
          <Button asChild>
            <Link href="/admin/products/new"><Plus /> New product</Link>
          </Button>
        }
      />
      <FilterBar action="/admin/products">
        <FilterField label="Search" className="min-w-48 flex-1">
          <input name="q" defaultValue={q} placeholder="Name or slug" className={filterInput} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ""} className={filterInput}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </FilterField>
        <FilterField label="Category">
          <select name="category" defaultValue={category ?? ""} className={filterInput}>
            <option value="">All</option>
            <option value="none">Uncategorised</option>
            {((categories ?? []) as { id: string; name: string }[]).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Stock">
          <select name="stock" defaultValue={stock ?? ""} className={filterInput}>
            <option value="">Any</option>
            <option value="low">Low or out of stock</option>
          </select>
        </FilterField>
      </FilterBar>

      {error ? (
        <Card role="alert" className="p-6 text-sm text-danger">Products could not be loaded.</Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package />}
            title={q || status || category || stock ? "No products match these filters" : "No products yet"}
            description="Create your first product to start selling."
            action={<Button asChild size="sm"><Link href="/admin/products/new">New product</Link></Button>}
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <THead>
              <tr><TH>Product</TH><TH>Category</TH><TH>Status</TH><TH className="text-right">Price</TH><TH className="text-right">Stock</TH><TH>Updated</TH></tr>
            </THead>
            <tbody>
              {rows.map((p) => {
                const active = p.product_variants.filter((v) => v.is_active);
                const stockTotal = active.reduce((s, v) => s + v.stock_quantity, 0);
                const low = active.some((v) => v.stock_quantity <= p.low_stock_threshold);
                const image = [...p.product_images].sort((a, b) => a.position - b.position)[0];
                return (
                  <TR key={p.id}>
                    <TD>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="size-10 shrink-0 overflow-hidden rounded-md bg-surface">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image.url} alt="" className="size-full object-cover" loading="lazy" />
                          ) : null}
                        </span>
                        <span>
                          <span className="block font-medium hover:underline">{p.name}</span>
                          <span className="text-xs text-muted">
                            {active.length} variant{active.length === 1 ? "" : "s"}{p.is_featured ? " · Featured" : ""}
                          </span>
                        </span>
                      </Link>
                    </TD>
                    <TD className="text-muted">{p.category?.name ?? "—"}</TD>
                    <TD><ProductStatusBadge status={p.status} /></TD>
                    <TD className="text-right tabular-nums">
                      {formatMoney(p.sale_price ?? p.price, settings.currency, settings.locale)}
                      {p.sale_price != null ? <span className="block text-xs text-muted line-through">{formatMoney(p.price, settings.currency, settings.locale)}</span> : null}
                    </TD>
                    <TD className={cn("text-right tabular-nums", stockTotal === 0 ? "text-danger" : low ? "text-warning" : "")}>{stockTotal}</TD>
                    <TD className="text-muted">{formatDate(p.updated_at, settings.timezone)}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={(n) => buildHref("/admin/products", current, { page: n })} />
    </div>
  );
}

export default function ProductsPage(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ProductList searchParams={props.searchParams} />
    </Suspense>
  );
}
