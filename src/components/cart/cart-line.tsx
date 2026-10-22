"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { removeFromCartAction, updateCartQuantityAction } from "@/actions/cart";
import { QuantityStepper } from "@/components/products/quantity-stepper";
import { ProductImage } from "@/components/products/product-image";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { QuoteLine } from "@/types/domain";

const ISSUE_TEXT: Record<string, string> = {
  unavailable: "No longer available — please remove it.",
  out_of_stock: "Out of stock — please remove it.",
  insufficient_stock: "Not enough stock for this quantity.",
};

export function CartLine({ line, currency, locale }: { line: QuoteLine; currency: string; locale: string }) {
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(line.quantity);
  const max = Math.max(1, Math.min(99, line.issue ? Math.max(line.available_quantity, 1) : line.available_quantity));

  const update = (quantity: number) => {
    setQty(quantity);
    startTransition(async () => {
      const result = await updateCartQuantityAction({ variantId: line.variant_id, quantity });
      if (!result.ok) {
        toast.error(result.error);
        setQty(line.quantity);
      } else if (result.message) toast.info(result.message);
    });
  };

  const remove = () =>
    startTransition(async () => {
      const result = await removeFromCartAction(line.variant_id);
      if (!result.ok) toast.error(result.error);
    });

  const showVariant = line.variant_title && line.variant_title !== "Default";
  return (
    <li className={cn("flex gap-4 py-5", pending && "opacity-60")}>
      <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-line-soft sm:size-28">
        <ProductImage src={line.image_url} alt={line.product_name} fill sizes="112px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {line.product_slug ? (
              <Link href={`/products/${line.product_slug}`} className="font-semibold hover:underline">
                {line.product_name}
              </Link>
            ) : (
              <p className="font-semibold">{line.product_name}</p>
            )}
            {showVariant ? <p className="text-sm text-muted">{line.variant_title}</p> : null}
            {line.unit_price != null ? (
              <p className="mt-1 text-sm tabular-nums text-ink-soft">
                {formatMoney(line.unit_price, currency, locale)}
                {line.compare_at_price != null && line.compare_at_price > line.unit_price ? (
                  <span className="ml-2 text-xs text-muted line-through">{formatMoney(line.compare_at_price, currency, locale)}</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 font-semibold tabular-nums">{line.issue ? "—" : formatMoney(line.line_total, currency, locale)}</p>
        </div>
        {line.issue ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {ISSUE_TEXT[line.issue]}
            {line.issue === "insufficient_stock" ? ` Only ${line.available_quantity} available.` : ""}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3">
          {line.issue === "unavailable" || line.issue === "out_of_stock" ? (
            <span />
          ) : (
            <QuantityStepper value={qty} max={max} onChange={update} disabled={pending} size="sm" label={`Quantity of ${line.product_name}`} />
          )}
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-danger"
            aria-label={`Remove ${line.product_name}`}
          >
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}
