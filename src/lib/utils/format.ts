// Display formatting only. Authoritative money math happens in the database.

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: number | string | null | undefined, currency = "PKR", locale = "en-PK") {
  const amount = toNumber(value);
  const whole = Number.isInteger(amount);
  const key = `${locale}|${currency}|${whole}`;
  let fmt = moneyFormatters.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: 2,
      });
    } catch {
      fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    }
    moneyFormatters.set(key, fmt);
  }
  return fmt.format(amount);
}

export function formatDate(
  value: string | Date,
  timeZone = "Asia/Karachi",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale = "en-PK",
) {
  const date = typeof value === "string" ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

export function formatDateTime(value: string | Date, timeZone = "Asia/Karachi", locale = "en-PK") {
  return formatDate(value, timeZone, { dateStyle: "medium", timeStyle: "short" }, locale);
}

export function formatNumber(value: number | string, locale = "en-PK") {
  return new Intl.NumberFormat(locale).format(toNumber(value));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};
