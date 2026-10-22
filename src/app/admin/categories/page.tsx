import Link from "next/link";
import { Suspense } from "react";
import { FolderTree, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TableSkeleton } from "@/components/admin/common";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Categories" };

type Cat = { id: string; name: string; slug: string; parent_id: string | null; is_visible: boolean; sort_order: number; image_url: string | null; products: { count: number }[] };

function flatten(cats: Cat[]): { cat: Cat; depth: number }[] {
  const byParent = new Map<string | null, Cat[]>();
  for (const c of cats) {
    const key = c.parent_id && cats.some((p) => p.id === c.parent_id) ? c.parent_id : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: { cat: Cat; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of byParent.get(parent) ?? []) {
      out.push({ cat: c, depth });
      if (depth < 6) walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

async function Categories() {
  await requirePermission("products");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, is_visible, sort_order, image_url, products(count)")
    .order("sort_order")
    .order("name");
  const rows = flatten((data ?? []) as Cat[]);
  return (
    <div className="space-y-5">
      <PageHeading
        title="Categories"
        description="Organise the catalog. Hidden categories stay out of the storefront."
        actions={<Button asChild><Link href="/admin/categories/new"><Plus /> New category</Link></Button>}
      />
      {error ? (
        <Card role="alert" className="p-6 text-sm text-danger">Categories could not be loaded.</Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={<FolderTree />} title="No categories yet" description="Create categories to group products." /></Card>
      ) : (
        <Card>
          <Table>
            <THead><tr><TH>Name</TH><TH>Slug</TH><TH>Visibility</TH><TH className="text-right">Products</TH><TH className="text-right">Order</TH></tr></THead>
            <tbody>
              {rows.map(({ cat, depth }) => (
                <TR key={cat.id}>
                  <TD>
                    <Link href={`/admin/categories/${cat.id}`} className="flex items-center gap-3 font-medium hover:underline" style={{ paddingLeft: depth * 20 }}>
                      <span className="size-8 shrink-0 overflow-hidden rounded bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {cat.image_url ? <img src={cat.image_url} alt="" className="size-full object-cover" /> : null}
                      </span>
                      {depth > 0 ? <span className="text-muted">↳</span> : null}
                      {cat.name}
                    </Link>
                  </TD>
                  <TD className="font-mono text-xs text-muted">{cat.slug}</TD>
                  <TD>{cat.is_visible ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}</TD>
                  <TD className="text-right tabular-nums">{cat.products?.[0]?.count ?? 0}</TD>
                  <TD className="text-right tabular-nums text-muted">{cat.sort_order}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Categories />
    </Suspense>
  );
}
