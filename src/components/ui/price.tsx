import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Props = {
  amount: number;
  compareAt?: number | null;
  currency: string;
  locale?: string;
  /** Prefix with "From" when variants have different prices. */
  from?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function Price({ amount, compareAt, currency, locale, from, className, size = "md" }: Props) {
  const discounted = compareAt != null && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums text-ink",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base",
          discounted && "text-accent-strong",
        )}
      >
        {from ? <span className="mr-1 text-xs font-medium text-muted">From</span> : null}
        {formatMoney(amount, currency, locale)}
      </span>
      {discounted ? (
        <span className={cn("text-muted line-through tabular-nums", size === "lg" ? "text-base" : "text-xs")}>
          <span className="sr-only">Was </span>
          {formatMoney(compareAt, currency, locale)}
        </span>
      ) : null}
    </span>
  );
}
