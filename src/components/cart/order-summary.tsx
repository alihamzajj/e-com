import { formatMoney } from "@/lib/utils/format";

type Props = {
  subtotal: number;
  discount: number;
  shipping: number | null;
  shippingLabel?: string;
  total: number;
  currency: string;
  locale: string;
  couponCode?: string | null;
  freeShippingRemaining?: number | null;
};

export function SummaryRows({ subtotal, discount, shipping, shippingLabel, total, currency, locale, couponCode, freeShippingRemaining }: Props) {
  const m = (v: number) => formatMoney(v, currency, locale);
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd className="tabular-nums">{m(subtotal)}</dd>
      </div>
      {discount > 0 ? (
        <div className="flex justify-between text-success">
          <dt>Discount{couponCode ? ` (${couponCode})` : ""}</dt>
          <dd className="tabular-nums">−{m(discount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt className="text-muted">Shipping{shippingLabel ? ` · ${shippingLabel}` : ""}</dt>
        <dd className="tabular-nums">{shipping == null ? "Calculated at checkout" : shipping === 0 ? "Free" : m(shipping)}</dd>
      </div>
      {freeShippingRemaining != null && freeShippingRemaining > 0 ? (
        <p className="rounded-sm bg-accent-soft px-3 py-2 text-xs text-accent-strong">
          Add {m(freeShippingRemaining)} more for free shipping.
        </p>
      ) : null}
      <div className="flex justify-between border-t border-line-soft pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{m(total)}</dd>
      </div>
    </dl>
  );
}
