import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/utils/format";
import { userMessage, logServerError } from "@/lib/errors";

export type ReportSummary = {
  gross_sales: number;
  discounts: number;
  refunds: number;
  shipping: number;
  net_sales: number;
  counted_orders: number;
  average_order_value: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  awaiting_payment: number;
  total_customers: number;
  new_customers: number;
  units_sold: number;
};

export type DailyPoint = {
  date: string;
  orders: number;
  all_orders: number;
  gross_sales: number;
  net_sales: number;
  revenue: number;
  new_customers: number;
};

export type SalesReport = {
  summary: ReportSummary;
  profit: {
    available: boolean;
    lines_with_cost: number;
    lines_total: number;
    cost_of_goods: number | null;
    gross_profit: number | null;
  };
  daily: DailyPoint[];
  monthly: { month: string; orders: number; net_sales: number }[];
  top_products: { product_id: string | null; name: string; units: number; revenue: number }[];
  category_sales: { name: string; revenue: number; units: number }[];
  status_breakdown: { status: string; count: number }[];
  low_stock: {
    variant_id: string;
    product_id: string;
    name: string;
    variant_title: string;
    sku: string;
    stock: number;
    threshold: number;
  }[];
};

function nums<T extends Record<string, unknown>>(row: T, keys: (keyof T)[]): T {
  const copy = { ...row };
  for (const k of keys) copy[k] = toNumber(row[k] as number) as T[keyof T];
  return copy;
}

export async function loadSalesReport(from: Date, to: Date): Promise<{ report: SalesReport } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_sales_report", { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error || !data) {
    logServerError("admin.report", error);
    return { error: userMessage(error, "The report could not be loaded.") };
  }
  const raw = data as SalesReport;
  const summary = Object.fromEntries(Object.entries(raw.summary).map(([k, v]) => [k, toNumber(v as number)])) as ReportSummary;
  return {
    report: {
      summary,
      profit: {
        available: Boolean(raw.profit?.available),
        lines_with_cost: toNumber(raw.profit?.lines_with_cost),
        lines_total: toNumber(raw.profit?.lines_total),
        cost_of_goods: raw.profit?.cost_of_goods == null ? null : toNumber(raw.profit.cost_of_goods),
        gross_profit: raw.profit?.gross_profit == null ? null : toNumber(raw.profit.gross_profit),
      },
      daily: (raw.daily ?? []).map((d) =>
        nums(d, ["orders", "all_orders", "gross_sales", "net_sales", "revenue", "new_customers"]),
      ),
      monthly: (raw.monthly ?? []).map((m) => nums(m, ["orders", "net_sales"])),
      top_products: (raw.top_products ?? []).map((p) => nums(p, ["units", "revenue"])),
      category_sales: (raw.category_sales ?? []).map((c) => nums(c, ["revenue", "units"])),
      status_breakdown: (raw.status_breakdown ?? []).map((s) => nums(s, ["count"])),
      low_stock: (raw.low_stock ?? []).map((l) => nums(l, ["stock", "threshold"])),
    },
  };
}
