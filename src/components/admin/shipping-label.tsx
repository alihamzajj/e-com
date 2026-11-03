import { code128B } from "@/lib/utils/code128";
import { formatDate, formatMoney, toNumber } from "@/lib/utils/format";
import type { Order, OrderItem, StoreSettings } from "@/types/domain";

/** Order number as a scannable Code 128 barcode. */
function Barcode({ value }: { value: string }) {
  const widths = code128B(value);
  const starts = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
  const total = starts.at(-1)! + widths.at(-1)!;
  const bars = widths.map((w, i) => (i % 2 === 0 ? <rect key={i} x={starts[i]} y={0} width={w} height={40} /> : null));
  // 10-module quiet zone on each side so scanners find the edges.
  return (
    <svg viewBox={`-10 0 ${total + 20} 40`} preserveAspectRatio="none" className="h-[0.62in] w-full" fill="#000" role="img" aria-label={`Barcode ${value}`}>
      {bars}
    </svg>
  );
}

function LabelLogo({ name }: { name: string }) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return (
    <span className="inline-flex items-center gap-[5px]">
      <svg viewBox="0 0 120 132" className="h-[0.36in] w-auto" aria-hidden>
        <path d="M37 46V35a23 23 0 0 1 46 0v11" fill="none" stroke="#000" strokeWidth="11" strokeLinecap="round" />
        <rect x="6" y="34" width="108" height="96" rx="36" fill="#000" />
        <path d="M78.7 67.3A26.5 26.5 0 1 0 86.5 86H63" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="inline-flex flex-col items-end leading-none">
        <span className="font-[family-name:var(--font-logo)] text-[22px] leading-[0.74] font-extrabold tracking-[-0.055em] lowercase">{first}</span>
        {rest.length ? <span className="-mr-[0.3em] mt-[2px] text-[8px] font-extrabold tracking-[0.3em] uppercase">{rest.join(" ")}</span> : null}
      </span>
    </span>
  );
}

/**
 * 4 × 6 inch shipping label for the box: who it goes to, cash to collect,
 * the order barcode, what is inside and who it is from. Pure black on white so
 * it prints cleanly on thermal and laser printers.
 */
export function ShippingLabel({ order, items, settings }: { order: Order; items: OrderItem[]; settings: StoreSettings }) {
  const a = order.shipping_address;
  const paid = order.payment_status === "paid" || order.payment_status === "partially_refunded";
  const collect = order.payment_method === "cod" && !paid ? toNumber(order.total) - toNumber(order.paid_total) : 0;
  const pieces = items.reduce((n, i) => n + i.quantity, 0);
  const shown = items.slice(0, 5);
  const cityLine = [a.city, a.state, a.postal_code].filter(Boolean).join(", ");

  return (
    <article className="shipping-label flex h-[6in] w-[4in] flex-col overflow-hidden bg-white p-[0.14in] font-sans text-[11px] leading-snug text-black">
      <header className="flex items-start justify-between border-b-2 border-black pb-[6px]">
        <LabelLogo name={settings.storeName} />
        <div className="text-right text-[10px] leading-tight">
          <p className="font-bold uppercase">{order.shipping_method_label}</p>
          <p>{formatDate(order.placed_at, settings.timezone)}</p>
        </div>
      </header>

      <section className="border-b-2 border-black py-[6px]">
        <p className="text-[9px] font-bold tracking-[0.18em] uppercase">Ship to</p>
        <p className="mt-[2px] text-[19px] leading-tight font-extrabold">{a.full_name}</p>
        <p className="text-[16px] font-extrabold tracking-wide tabular-nums">{a.phone || order.phone}</p>
        <p className="mt-[3px] text-[12px]">
          {a.line1}
          {a.line2 ? <>, {a.line2}</> : null}
        </p>
        <p className="mt-[2px] text-[17px] leading-tight font-extrabold uppercase">{cityLine}</p>
        {a.country ? <p className="text-[11px] uppercase">{a.country}</p> : null}
      </section>

      {collect > 0 ? (
        <section className="my-[6px] flex items-center justify-between rounded-[3px] bg-black px-[8px] py-[5px] text-white">
          <span className="text-[11px] leading-tight font-bold uppercase">
            Cash on delivery
            <br />
            Collect
          </span>
          <span className="text-[24px] font-extrabold tabular-nums">{formatMoney(collect, order.currency, settings.locale)}</span>
        </section>
      ) : (
        <section className="my-[6px] rounded-[3px] border-2 border-black px-[8px] py-[5px] text-center text-[13px] font-extrabold uppercase">
          Prepaid · Do not collect cash
        </section>
      )}

      <section className="text-center">
        <Barcode value={order.order_number} />
        <p className="mt-[1px] text-[15px] font-extrabold tracking-[0.12em]">{order.order_number}</p>
        {order.tracking_number ? <p className="text-[10px]">Tracking: {order.tracking_number}</p> : null}
      </section>

      <section className="mt-[6px] min-h-0 flex-1 border-t-2 border-black pt-[5px]">
        <p className="text-[9px] font-bold tracking-[0.18em] uppercase">
          Contents · {pieces} {pieces === 1 ? "item" : "items"}
        </p>
        <ul className="mt-[2px] text-[10.5px] leading-tight">
          {shown.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="truncate">
                {i.product_name}
                {i.variant_title && i.variant_title !== "Default" ? ` (${i.variant_title})` : ""}
              </span>
              <span className="shrink-0 font-bold">× {i.quantity}</span>
            </li>
          ))}
          {items.length > shown.length ? <li className="italic">+ {items.length - shown.length} more</li> : null}
        </ul>
        {order.customer_note ? <p className="mt-[3px] line-clamp-2 text-[10px] italic">Note: {order.customer_note}</p> : null}
      </section>

      <footer className="border-t-2 border-black pt-[5px] text-[10px] leading-tight">
        <p className="text-[9px] font-bold tracking-[0.18em] uppercase">From</p>
        <p className="font-bold">{settings.storeName}</p>
        {settings.contactAddress ? <p>{settings.contactAddress}</p> : null}
        {settings.contactPhone ? <p>{settings.contactPhone}</p> : null}
      </footer>
    </article>
  );
}
