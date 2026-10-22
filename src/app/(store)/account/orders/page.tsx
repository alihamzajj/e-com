import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/account/order-badges";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const metadata = { title: "Orders" };

const PAGE = 10;

export default function OrdersPage(props: PageProps<"/account/orders">) {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" aria-busy />}>
      <Orders searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/account/orders">["searchParams"] }) {
  await requireUser("/account/orders");
  const sp = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const supabase = await createClient();
  const [settings, { data, count }] = await Promise.all([
    getStoreSettings(),
    supabase
      .from("orders")
      .select("id, order_number, placed_at, total, currency, status, payment_method, payment_status, order_items(count)", { count: "exact" })
      .order("placed_at", { ascending: false })
      .range((page - 1) * PAGE, page * PAGE - 1),
  ]);
  type Row = {
    id: string;
    order_number: string;
    placed_at: string;
    total: number;
    currency: string;
    status: string;
    payment_method: string;
    payment_status: string;
    order_items: { count: number }[];
  };
  const orders = (data ?? []) as Row[];

  if (orders.length === 0 && page === 1) {
    return (
      <Card>
        <EmptyState
          icon={<Package />}
          title="No orders yet"
          description="When you place an order it will appear here with live status updates."
          action={
            <Button asChild>
              <Link href="/products">Start shopping</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <ul className="divide-y divide-line-soft">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-surface/60">
                <div className="min-w-36">
                  <p className="font-semibold">{o.order_number}</p>
                  <p className="text-xs text-muted">{formatDate(o.placed_at, settings.timezone)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.payment_status} method={o.payment_method} />
                </div>
                <p className="ml-auto text-sm text-muted">
                  {o.order_items?.[0]?.count ?? 0} item{(o.order_items?.[0]?.count ?? 0) === 1 ? "" : "s"}
                </p>
                <p className="w-28 text-right font-semibold tabular-nums">{formatMoney(o.total, o.currency, settings.locale)}</p>
                <ChevronRight className="size-4 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Pagination page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE))} hrefFor={(p) => `/account/orders?page=${p}`} />
    </div>
  );
}
