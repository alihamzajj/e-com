"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, ORDER_STATUS_LABELS } from "@/lib/utils/format";

const C = {
  accent: "#ff5a1f",
  ink: "#1b1b1c",
  grey: "#8e949a",
  sand: "#c9a27e",
  steel: "#5d7f9e",
  light: "#b9bdc1",
  grid: "#e6e6e2",
  axis: "#6f6f6c",
};
const PALETTE = [C.accent, C.ink, C.steel, C.sand, C.grey, C.light];

type Money = { currency: string; locale: string };

function compactMoney(v: number, { currency, locale }: Money) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(v);
  } catch {
    return String(v);
  }
}

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function ChartFrame({
  title,
  description,
  empty,
  height = 260,
  children,
}: {
  title: string;
  description?: string;
  empty?: boolean;
  height?: number;
  children: React.ReactElement;
}) {
  return (
    <figure className="rounded-lg border border-line-soft bg-card p-5 shadow-[var(--shadow-card)]">
      <figcaption className="mb-4">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </figcaption>
      {empty ? (
        <div className="flex items-center justify-center rounded-md bg-surface text-sm text-muted" style={{ height }}>
          No data for this period
        </div>
      ) : (
        <div style={{ height }} className="w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

const tooltipStyle = {
  contentStyle: { borderRadius: 6, border: `1px solid ${C.grid}`, fontSize: 12, boxShadow: "0 8px 24px -12px rgba(0,0,0,.25)" },
  labelStyle: { fontWeight: 600, color: C.ink },
};

const axisProps = { stroke: C.axis, fontSize: 11, tickLine: false, axisLine: false } as const;

type Daily = { date: string; orders: number; gross_sales: number; net_sales: number; revenue: number; new_customers: number };

export function DailySalesChart({ data, money }: { data: Daily[]; money: Money }) {
  const empty = data.every((d) => d.gross_sales === 0 && d.net_sales === 0);
  return (
    <ChartFrame title="Daily sales" description="Gross sales vs net sales (after discounts and refunds)" empty={empty}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={16} />
        <YAxis tickFormatter={(v) => compactMoney(v, money)} {...axisProps} width={64} />
        <Tooltip {...tooltipStyle} labelFormatter={(l) => String(l)} formatter={(v, name) => [formatMoney(Number(v), money.currency, money.locale), name]} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="gross_sales" name="Gross sales" stroke={C.ink} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="net_sales" name="Net sales" stroke={C.accent} strokeWidth={2} dot={false} />
      </LineChart>
    </ChartFrame>
  );
}

export function RevenueChart({ data, money }: { data: Daily[]; money: Money }) {
  const empty = data.every((d) => d.revenue === 0);
  return (
    <ChartFrame title="Revenue over time" description="Order totals incl. shipping, minus refunds" empty={empty}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity={0.25} />
            <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={16} />
        <YAxis tickFormatter={(v) => compactMoney(v, money)} {...axisProps} width={64} />
        <Tooltip {...tooltipStyle} formatter={(v) => [formatMoney(Number(v), money.currency, money.locale), "Revenue"]} />
        <Area type="monotone" dataKey="revenue" stroke={C.accent} strokeWidth={2} fill="url(#revFill)" />
      </AreaChart>
    </ChartFrame>
  );
}

export function OrdersPerDayChart({ data }: { data: Daily[] }) {
  const empty = data.every((d) => d.orders === 0);
  return (
    <ChartFrame title="Orders per day" description="Counted orders (not cancelled, payment confirmed or COD)" empty={empty}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={16} />
        <YAxis allowDecimals={false} {...axisProps} width={32} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "#f4f4f2" }} formatter={(v) => [v, "Orders"]} />
        <Bar dataKey="orders" fill={C.ink} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartFrame>
  );
}

export function MonthlyComparisonChart({ data, money }: { data: { month: string; orders: number; net_sales: number }[]; money: Money }) {
  const empty = data.every((d) => d.net_sales === 0);
  return (
    <ChartFrame title="Monthly net sales" description="Last 12 months ending with the selected period" empty={empty}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthLabel} {...axisProps} />
        <YAxis tickFormatter={(v) => compactMoney(v, money)} {...axisProps} width={64} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fill: "#f4f4f2" }}
          labelFormatter={(l) => monthLabel(String(l))}
          formatter={(v, name) => (name === "net_sales" ? [formatMoney(Number(v), money.currency, money.locale), "Net sales"] : [v, "Orders"])}
        />
        <Bar dataKey="net_sales" fill={C.accent} radius={[3, 3, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartFrame>
  );
}

export function TopProductsChart({ data, money }: { data: { name: string; units: number; revenue: number }[]; money: Money }) {
  const rows = data.slice(0, 8).map((d) => ({ ...d, label: d.name.length > 22 ? `${d.name.slice(0, 21)}…` : d.name }));
  return (
    <ChartFrame title="Best-selling products" description="Units sold in counted orders" empty={rows.length === 0} height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="label" {...axisProps} width={140} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fill: "#f4f4f2" }}
          formatter={(v, _n, item) => [`${v} units · ${formatMoney((item.payload as { revenue: number }).revenue, money.currency, money.locale)}`, "Sold"]}
        />
        <Bar dataKey="units" fill={C.ink} radius={[0, 3, 3, 0]} maxBarSize={20} />
      </BarChart>
    </ChartFrame>
  );
}

export function CategorySalesChart({ data, money }: { data: { name: string; revenue: number }[]; money: Money }) {
  return (
    <ChartFrame title="Sales by category" description="Item revenue before order-level discounts" empty={data.length === 0}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="name" {...axisProps} interval={0} />
        <YAxis tickFormatter={(v) => compactMoney(v, money)} {...axisProps} width={64} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "#f4f4f2" }} formatter={(v) => [formatMoney(Number(v), money.currency, money.locale), "Revenue"]} />
        <Bar dataKey="revenue" radius={[3, 3, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: C.sand,
  confirmed: C.steel,
  processing: C.grey,
  shipped: C.ink,
  delivered: C.accent,
  cancelled: C.light,
  returned: "#c22f2f",
};

export function StatusBreakdownChart({ data }: { data: { status: string; count: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: ORDER_STATUS_LABELS[d.status] ?? d.status }));
  return (
    <ChartFrame title="Order status breakdown" description="All orders placed in the period" empty={rows.length === 0}>
      <PieChart>
        <Pie data={rows} dataKey="count" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
          {rows.map((r) => (
            <Cell key={r.status} fill={STATUS_COLORS[r.status] ?? C.grey} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v, name) => [v, name]} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartFrame>
  );
}

export function CustomerGrowthChart({ data }: { data: Daily[] }) {
  const rows = data.reduce<{ date: string; new_customers: number; cumulative: number }[]>((acc, d) => {
    const prev = acc.length ? acc[acc.length - 1].cumulative : 0;
    acc.push({ date: d.date, new_customers: d.new_customers, cumulative: prev + d.new_customers });
    return acc;
  }, []);
  const empty = (rows.at(-1)?.cumulative ?? 0) === 0;
  return (
    <ChartFrame title="Customer growth" description="New customer accounts in the period (cumulative)" empty={empty}>
      <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={16} />
        <YAxis allowDecimals={false} {...axisProps} width={32} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [v, name === "cumulative" ? "Total new" : "New that day"]} />
        <Line type="stepAfter" dataKey="cumulative" stroke={C.accent} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="new_customers" stroke={C.grey} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ChartFrame>
  );
}

/** Client-side CSV export of the already-loaded daily rows. */
export function ExportCsvButton({ rows, filename }: { rows: Daily[]; filename: string }) {
  function download() {
    const header = ["date", "orders", "gross_sales", "net_sales", "revenue", "new_customers"];
    const lines = [header.join(","), ...rows.map((r) => header.map((h) => r[h as keyof Daily]).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="inline-flex h-8 items-center rounded-sm border border-line bg-card px-3 text-xs font-medium text-ink hover:border-ink/40 disabled:opacity-50"
    >
      Export CSV
    </button>
  );
}
