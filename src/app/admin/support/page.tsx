import Link from "next/link";
import { Suspense } from "react";
import { LifeBuoy } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { buildHref, pageParam, searchParam } from "@/features/admin/guard";
import { TableSkeleton } from "@/components/admin/common";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Messages" };
const PAGE_SIZE = 25;
const STATUSES = ["new", "open", "resolved"] as const;

type Row = { id: string; name: string; email: string; subject: string; status: string; created_at: string; user_id: string | null };

function SupportStatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "new" ? "accent" : status === "open" ? "warning" : "success"} className="capitalize">{status}</Badge>;
}

async function Support({ searchParams }: { searchParams: PageProps<"/admin/support">["searchParams"] }) {
  await requirePermission("support");
  const sp = await searchParams;
  const settings = await getStoreSettings();
  const raw = searchParam(sp, "status");
  const status = raw === "all" ? undefined : STATUSES.find((s) => s === raw) ?? (raw ? undefined : "new");
  const page = pageParam(sp);
  const supabase = await createClient();
  let query = supabase
    .from("support_messages")
    .select("id, name, email, subject, status, created_at, user_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  const { data, count, error } = await query;
  const rows = (data ?? []) as Row[];
  const tabs = [...STATUSES, "all"] as const;
  const active = status ?? "all";

  return (
    <div className="space-y-5">
      <PageHeading title="Messages" description="What customers sent through the contact form." />
      <nav aria-label="Status" className="flex flex-wrap gap-1 rounded-md border border-line-soft bg-card p-1">
        {tabs.map((t) => (
          <Link
            key={t}
            href={t === "new" ? "/admin/support" : `/admin/support?status=${t}`}
            aria-current={active === t ? "page" : undefined}
            className={cn("inline-flex h-8 items-center rounded-sm px-3 text-xs font-medium capitalize text-ink-soft hover:bg-surface", active === t && "bg-ink text-white hover:bg-ink")}
          >
            {t}
          </Link>
        ))}
      </nav>
      {error ? (
        <Card role="alert" className="p-6 text-sm text-danger">Messages could not be loaded.</Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={<LifeBuoy />} title="No messages" description={status === "new" ? "You're all caught up." : undefined} /></Card>
      ) : (
        <Card>
          <Table>
            <THead><tr><TH>Subject</TH><TH>From</TH><TH>Received</TH><TH>Status</TH></tr></THead>
            <tbody>
              {rows.map((m) => (
                <TR key={m.id}>
                  <TD><Link href={`/admin/support/${m.id}`} className="font-medium hover:underline">{m.subject}</Link></TD>
                  <TD>{m.name}<span className="block text-xs text-muted">{m.email}{m.user_id ? " · customer" : ""}</span></TD>
                  <TD className="text-muted">{formatDateTime(m.created_at, settings.timezone, settings.locale)}</TD>
                  <TD><SupportStatusBadge status={m.status} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Pagination page={page} pageCount={Math.ceil((count ?? 0) / PAGE_SIZE)} hrefFor={(n) => buildHref("/admin/support", { status: raw }, { page: n })} />
    </div>
  );
}

export default function SupportPage(props: PageProps<"/admin/support">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Support searchParams={props.searchParams} />
    </Suspense>
  );
}
