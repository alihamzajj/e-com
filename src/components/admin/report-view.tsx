import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { loadSalesReport, type SalesReport } from "@/features/analytics/report";
import { KpiCard, SectionCard } from "@/components/admin/common";
import { Card, Skeleton } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import {
  CategorySalesChart,
  CustomerGrowthChart,
  DailySalesChart,
  ExportCsvButton,
  MonthlyComparisonChart,
  OrdersPerDayChart,
  RevenueChart,
  StatusBreakdownChart,
  TopProductsChart,
} from "@/components/charts/report-charts";
import { formatMoney, formatNumber } from "@/lib/utils/format";
import type { StoreSettings } from "@/types/domain";
import type { ResolvedRange } from "@/features/admin/date-range";

export function MetricsExplainer() {
  return (
    <details className="rounded-lg border border-line-soft bg-card px-5 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-ink">How these numbers are calculated</summary>
      <dl className="mt-3 grid gap-2 text-muted sm:grid-cols-2">
        <div><dt className="font-medium text-ink">Counted orders</dt><dd>Placed in the period, not cancelled, and either cash on delivery or an online payment verified by the gateway. Unpaid online orders are excluded.</dd></div>
        <div><dt className="font-medium text-ink">Gross sales</dt><dd>Sum of item subtotals of counted orders, before discounts. Excludes shipping and tax.</dd></div>
        <div><dt className="font-medium text-ink">Net sales</dt><dd>Gross sales − discounts − refunds. Refunds are attributed to the date the order was placed.</dd></div>
        <div><dt className="font-medium text-ink">Average order value</dt><dd>(Gross sales − discounts) ÷ counted orders.</dd></div>
        <div><dt className="font-medium text-ink">Revenue (chart)</dt><dd>Order totals including shipping, minus refunds, for counted orders.</dd></div>
        <div><dt className="font-medium text-ink">Profit</dt><dd>Only shown when every counted item has a recorded unit cost: Σ(price − cost) × qty − discounts. Revenue is not profit.</dd></div>
        <div><dt className="font-medium text-ink">Pending / completed / cancelled</dt><dd>All orders placed in the period by current status. Pending covers pending, confirmed, processing and shipped.</dd></div>
        <div><dt className="font-medium text-ink">Dates</dt><dd>Days are bucketed in the store time zone.</dd></div>
      </dl>
    </details>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading report">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function Kpis({ report, settings }: { report: SalesReport; settings: StoreSettings }) {
  const s = report.summary;
  const money = (v: number) => formatMoney(v, settings.currency, settings.locale);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Gross sales" value={money(s.gross_sales)} hint={`${formatNumber(s.units_sold)} units sold`} />
      <KpiCard label="Net sales" value={money(s.net_sales)} tone="accent" hint={`after ${money(s.discounts)} discounts`} />
      <KpiCard label="Total orders" value={formatNumber(s.total_orders)} hint={`${formatNumber(s.counted_orders)} counted`} href="/admin/orders" />
      <KpiCard label="Average order value" value={money(s.average_order_value)} />
      <KpiCard label="Refunds" value={money(s.refunds)} />
      <KpiCard label="Pending orders" value={formatNumber(s.pending_orders)} hint={s.awaiting_payment ? `${s.awaiting_payment} awaiting payment` : undefined} href="/admin/orders?status=pending" />
      <KpiCard label="Completed orders" value={formatNumber(s.completed_orders)} href="/admin/orders?status=delivered" />
      <KpiCard label="Cancelled orders" value={formatNumber(s.cancelled_orders)} hint={s.returned_orders ? `${s.returned_orders} returned` : undefined} />
      <KpiCard label="Customers" value={formatNumber(s.total_customers)} hint={`+${formatNumber(s.new_customers)} in period`} href="/admin/customers" />
      <KpiCard
        label="Low-stock variants"
        value={formatNumber(report.low_stock.length)}
        tone={report.low_stock.length ? "warning" : "default"}
        href="/admin/products?stock=low"
      />
    </div>
  );
}

function ProfitCard({ report, settings }: { report: SalesReport; settings: StoreSettings }) {
  const p = report.profit;
  const money = (v: number) => formatMoney(v, settings.currency, settings.locale);
  if (p.available && p.gross_profit !== null) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Gross profit" value={money(p.gross_profit)} hint="Item margin minus discounts" tone="accent" />
        <KpiCard label="Cost of goods" value={money(p.cost_of_goods ?? 0)} />
      </div>
    );
  }
  return (
    <Card className="flex items-start gap-3 p-4 text-sm text-muted">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>
        Profit is not shown: {p.lines_total === 0 ? "there are no counted sales in this period." : `only ${p.lines_with_cost} of ${p.lines_total} sold lines have a recorded cost price. Add cost prices to products to see profit.`}
      </p>
    </Card>
  );
}

function LowStockTable({ report }: { report: SalesReport }) {
  return (
    <SectionCard title="Low stock" description="Active variants at or below their threshold" bodyClassName="p-0">
      {report.low_stock.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">All variants are above their thresholds.</p>
      ) : (
        <Table className="min-w-0">
          <THead>
            <tr><TH>Product</TH><TH>SKU</TH><TH className="text-right">Stock</TH></tr>
          </THead>
          <tbody>
            {report.low_stock.map((l) => (
              <TR key={l.variant_id}>
                <TD>
                  <Link href={`/admin/products/${l.product_id}`} className="font-medium hover:underline">{l.name}</Link>
                  {l.variant_title !== "Default" ? <span className="block text-xs text-muted">{l.variant_title}</span> : null}
                </TD>
                <TD className="font-mono text-xs">{l.sku}</TD>
                <TD className={`text-right tabular-nums ${l.stock === 0 ? "text-danger" : "text-warning"}`}>
                  {l.stock} / {l.threshold}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </SectionCard>
  );
}

function BestSellers({ report, settings }: { report: SalesReport; settings: StoreSettings }) {
  return (
    <SectionCard title="Best sellers" bodyClassName="p-0">
      {report.top_products.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">No sales in this period yet.</p>
      ) : (
        <ol className="divide-y divide-line-soft">
          {report.top_products.slice(0, 6).map((p, i) => (
            <li key={p.product_id ?? p.name} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="w-5 text-xs text-muted tabular-nums">{i + 1}</span>
              <span className="flex-1 truncate font-medium">
                {p.product_id ? <Link href={`/admin/products/${p.product_id}`} className="hover:underline">{p.name}</Link> : p.name}
              </span>
              <span className="text-xs text-muted tabular-nums">{p.units} sold</span>
              <span className="w-28 text-right tabular-nums">{formatMoney(p.revenue, settings.currency, settings.locale)}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

export async function ReportView({
  range,
  settings,
  mode,
  extra,
}: {
  range: ResolvedRange;
  settings: StoreSettings;
  mode: "overview" | "full";
  extra?: ReactNode;
}) {
  const result = await loadSalesReport(range.from, range.to);
  if ("error" in result) {
    return (
      <Card role="alert" className="p-6 text-sm text-danger">
        {result.error}
      </Card>
    );
  }
  const { report } = result;
  const money = { currency: settings.currency, locale: settings.locale };

  if (mode === "overview") {
    return (
      <div className="space-y-6">
        <Kpis report={report} settings={settings} />
        <div className="grid gap-4 xl:grid-cols-2">
          <DailySalesChart data={report.daily} money={money} />
          <OrdersPerDayChart data={report.daily} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <BestSellers report={report} settings={settings} />
          <StatusBreakdownChart data={report.status_breakdown} />
        </div>
        {extra}
        <LowStockTable report={report} />
        <MetricsExplainer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Kpis report={report} settings={settings} />
      <ProfitCard report={report} settings={settings} />
      <div className="flex justify-end">
        <ExportCsvButton rows={report.daily} filename={`sales-${range.fromDate}-to-${range.toDate}.csv`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <DailySalesChart data={report.daily} money={money} />
        <RevenueChart data={report.daily} money={money} />
        <OrdersPerDayChart data={report.daily} />
        <MonthlyComparisonChart data={report.monthly} money={money} />
        <TopProductsChart data={report.top_products} money={money} />
        <CategorySalesChart data={report.category_sales} money={money} />
        <StatusBreakdownChart data={report.status_breakdown} />
        <CustomerGrowthChart data={report.daily} />
      </div>
      <MetricsExplainer />
    </div>
  );
}
