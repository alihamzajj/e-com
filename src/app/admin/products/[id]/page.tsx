import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { ImageManager } from "@/components/admin/image-manager";
import { StockAdjustDialog } from "@/components/admin/stock-adjust";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormSkeleton, ProductStatusBadge, SectionCard } from "@/components/admin/common";
import { PageHeading } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { deleteProductAction } from "@/actions/admin/products";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Edit product" };

type Variant = {
  id: string; sku: string; title: string; options: Record<string, string>; price: number | null; sale_price: number | null;
  stock_quantity: number; is_active: boolean; position: number;
};
type Product = {
  id: string; name: string; slug: string; category_id: string | null; short_description: string | null; description: string | null;
  specifications: { label: string; value: string }[]; option_names: string[]; price: number; sale_price: number | null; cost_price: number | null;
  status: "draft" | "active" | "archived"; is_featured: boolean; low_stock_threshold: number;
  product_variants: Variant[]; product_images: { id: string; url: string; alt: string | null; position: number; created_at: string }[];
};

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

async function EditProduct({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  await requirePermission("products");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const settings = await getStoreSettings();
  const supabase = await createClient();
  const [{ data }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_variants(*), product_images(id, url, alt, position, created_at)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order").order("name"),
  ]);
  if (!data) notFound();
  const p = data as unknown as Product;
  const variants = [...p.product_variants].sort((a, b) => a.position - b.position);
  const images = [...p.product_images].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("id, quantity_change, quantity_after, reason, note, created_at, order_id, product_variants!inner(sku, product_id)")
    .eq("product_variants.product_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const initial: ProductFormValues = {
    name: p.name,
    slug: p.slug,
    categoryId: p.category_id ?? "",
    shortDescription: p.short_description ?? "",
    description: p.description ?? "",
    specifications: p.specifications ?? [],
    optionNames: (p.option_names ?? []).map((value) => ({ value })),
    price: str(p.price),
    salePrice: str(p.sale_price),
    costPrice: str(p.cost_price),
    status: p.status,
    isFeatured: p.is_featured,
    lowStockThreshold: str(p.low_stock_threshold),
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      optionValues: (p.option_names ?? []).map((n) => v.options?.[n] ?? ""),
      price: str(v.price),
      salePrice: str(v.sale_price),
      stockQuantity: str(v.stock_quantity),
      isActive: v.is_active,
    })),
  };

  type Movement = { id: string; quantity_change: number; quantity_after: number; reason: string; note: string | null; created_at: string; order_id: string | null; product_variants: { sku: string } };

  return (
    <div className="space-y-5">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Products
      </Link>
      <PageHeading
        title={p.name}
        description={`/products/${p.slug}`}
        actions={
          <>
            <ProductStatusBadge status={p.status} />
            {p.status === "active" ? (
              <Link href={`/products/${p.slug}`} target="_blank" className="inline-flex h-8 items-center gap-1 rounded-sm border border-line bg-card px-3 text-xs hover:border-ink/40">
                <ExternalLink className="size-3.5" /> View
              </Link>
            ) : null}
            <ConfirmButton
              title="Delete this product?"
              description="Products that appear on orders are archived instead, so order history stays intact. Products without orders are permanently deleted with their images."
              confirmLabel="Delete"
              action={() => deleteProductAction(p.id)}
              redirectTo="/admin/products"
            >
              Delete
            </ConfirmButton>
          </>
        }
      />

      <ProductForm productId={p.id} initial={initial} categories={(categories ?? []) as { id: string; name: string }[]} currency={settings.currency} />

      <SectionCard title="Images" description="Use the arrows to reorder. The first image is the main image.">
        <ImageManager productId={p.id} images={images} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Inventory" description={`Low-stock threshold: ${p.low_stock_threshold}`} bodyClassName="p-0">
          <Table className="min-w-0">
            <THead><tr><TH>Variant</TH><TH>SKU</TH><TH className="text-right">Stock</TH><TH /></tr></THead>
            <tbody>
              {variants.map((v) => (
                <TR key={v.id}>
                  <TD>{v.title}{!v.is_active ? <span className="ml-2 text-xs text-muted">(inactive)</span> : null}</TD>
                  <TD className="font-mono text-xs">{v.sku}</TD>
                  <TD className={cn("text-right tabular-nums", v.stock_quantity === 0 ? "text-danger" : v.stock_quantity <= p.low_stock_threshold ? "text-warning" : "")}>
                    {v.stock_quantity}
                  </TD>
                  <TD className="text-right"><StockAdjustDialog variantId={v.id} label={`${p.name} · ${v.title}`} current={v.stock_quantity} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </SectionCard>
        <SectionCard title="Recent stock movements" bodyClassName="p-0">
          {(movements ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No stock movements yet.</p>
          ) : (
            <Table className="min-w-0">
              <THead><tr><TH>When</TH><TH>SKU</TH><TH>Reason</TH><TH className="text-right">Change</TH><TH className="text-right">After</TH></tr></THead>
              <tbody>
                {((movements ?? []) as unknown as Movement[]).map((m) => (
                  <TR key={m.id}>
                    <TD className="text-xs text-muted">{formatDateTime(m.created_at, settings.timezone, settings.locale)}</TD>
                    <TD className="font-mono text-xs">{m.product_variants.sku}</TD>
                    <TD className="capitalize">
                      {m.order_id ? <Link className="hover:underline" href={`/admin/orders/${m.order_id}`}>{m.reason}</Link> : m.reason}
                      {m.note ? <span className="block text-xs normal-case text-muted">{m.note}</span> : null}
                    </TD>
                    <TD className={cn("text-right tabular-nums", m.quantity_change > 0 ? "text-success" : "text-danger")}>
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </TD>
                    <TD className="text-right tabular-nums">{m.quantity_after}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditProduct params={props.params} />
    </Suspense>
  );
}
