import Link from "next/link";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { buildHref, pageParam, searchParam } from "@/features/admin/guard";
import { FilterBar, FilterField, filterInput, TableSkeleton } from "@/components/admin/common";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const metadata = { title: "Customers" };
const PAGE_SIZE = 25;

type Row = {
  id: string; email: string | null; full_name: string | null; phone: string | null; role: string; created_at: string;
  order_count: number; total_spent: number; last_order_at: string | null; total_count: number;
};

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  await requirePermission("customers");
  const sp = await searchParams;
  const settings = await getStoreSettings();
  const q = searchParam(sp, "q")?.slice(0, 80);
  const page = pageParam(sp);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_customers", {
    p_search: q ?? null,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = (data ?? []) as Row[];
  const total = Number(rows[0]?.total_count ?? 0);

  return (
    <div className="space-y-5">
      <PageHeading title="Customers" description={q ? `${total} matching “${q}”` : `${total} accounts`} />
      <FilterBar action="/admin/customers">
        <FilterField label="Search" className="min-w-60 flex-1">
          <input name="q" defaultValue={q} placeholder="Name, email or phone" className={filterInput} />
        </FilterField>
      </FilterBar>
      {error ? (
        <Card role="alert" className="p-6 text-sm text-danger">Customers could not be loaded.</Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={<Users />} title={q ? "No customers match" : "No customers yet"} /></Card>
      ) : (
        <Card>
          <Table>
            <THead><tr><TH>Customer</TH><TH>Phone</TH><TH>Joined</TH><TH className="text-right">Orders</TH><TH className="text-right">Total spent</TH><TH>Last order</TH></tr></THead>
            <tbody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">{c.full_name || "—"}</Link>
                    {c.role !== "customer" ? <Badge tone="dark" className="ml-2 capitalize">{c.role}</Badge> : null}
                    <span className="block text-xs text-muted">{c.email}</span>
                  </TD>
                  <TD className="text-muted">{c.phone || "—"}</TD>
                  <TD className="text-muted">{formatDate(c.created_at, settings.timezone)}</TD>
                  <TD className="text-right tabular-nums">{c.order_count}</TD>
                  <TD className="text-right tabular-nums">{formatMoney(c.total_spent, settings.currency, settings.locale)}</TD>
                  <TD className="text-muted">{c.last_order_at ? formatDate(c.last_order_at, settings.timezone) : "—"}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={(n) => buildHref("/admin/customers", { q }, { page: n })} />
    </div>
  );
}

export default function CustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Customers searchParams={props.searchParams} />
    </Suspense>
  );
}
