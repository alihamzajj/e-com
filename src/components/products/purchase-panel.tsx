"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ShoppingBag, Zap } from "lucide-react";
import { addToCartAction } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/primitives";
import { QuantityStepper } from "./quantity-stepper";
import { compareAtPrice, computeUnitPrice, discountPercent, stockState } from "@/lib/pricing";
import { cn } from "@/lib/utils/cn";
import type { ProductDetail } from "@/types/domain";

type Props = {
  product: Pick<ProductDetail, "id" | "price" | "sale_price" | "option_names" | "variants" | "low_stock_threshold">;
  stock: Record<string, number>;
  currency: string;
  locale: string;
};

type Variant = ProductDetail["variants"][number];

function matches(v: Variant, selection: Record<string, string>) {
  return Object.entries(selection).every(([k, val]) => v.options[k] === val);
}

export function PurchasePanel({ product, stock, currency, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const variants = product.variants;
  // Option names come from the product; fall back to keys present on variants.
  const optionNames = useMemo(() => {
    const names = product.option_names.filter((n) => variants.some((v) => n in v.options));
    if (names.length) return names;
    return [...new Set(variants.flatMap((v) => Object.keys(v.options)))];
  }, [product.option_names, variants]);

  const initial = variants.find((v) => (stock[v.id] ?? 0) > 0) ?? variants[0];
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    initial ? Object.fromEntries(optionNames.map((n) => [n, initial.options[n]]).filter(([, v]) => v !== undefined)) : {},
  );
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((v) => optionNames.every((n) => v.options[n] === selection[n])) ?? (optionNames.length === 0 ? variants[0] : undefined);
  const available = selected ? stock[selected.id] ?? 0 : 0;
  const state = stockState(available, product.low_stock_threshold);
  const unit = selected ? computeUnitPrice(product.price, product.sale_price, selected.price, selected.sale_price) : product.price;
  const compareAt = selected ? compareAtPrice(product.price, selected.price) : product.price;
  const off = discountPercent(unit, compareAt);
  const qty = Math.min(quantity, Math.max(available, 1));

  const valuesFor = (name: string) => [...new Set(variants.map((v) => v.options[name]).filter(Boolean))];
  const valueAvailable = (name: string, value: string) =>
    variants.some((v) => matches(v, { ...selection, [name]: value }) && (stock[v.id] ?? 0) > 0);
  const valueExists = (name: string, value: string) => variants.some((v) => matches(v, { ...selection, [name]: value }));

  const choose = (name: string, value: string) => {
    const next = { ...selection, [name]: value };
    // If that combination doesn't exist, jump to the first variant with this value.
    if (!variants.some((v) => matches(v, next))) {
      const fallback = variants.find((v) => v.options[name] === value && (stock[v.id] ?? 0) > 0) ?? variants.find((v) => v.options[name] === value);
      if (fallback) {
        setSelection(Object.fromEntries(optionNames.map((n) => [n, fallback.options[n]])));
        setQuantity(1);
        return;
      }
    }
    setSelection(next);
    setQuantity(1);
  };

  const add = (buyNow: boolean) => {
    if (!selected) return;
    startTransition(async () => {
      const result = await addToCartAction({ variantId: selected.id, quantity: qty });
      if (result.ok) {
        if (buyNow) router.push("/checkout");
        else toast.success(result.message ?? "Added to cart.", { action: { label: "View cart", onClick: () => router.push("/cart") } });
      } else if (buyNow && result.error.includes("already in your cart")) {
        router.push("/checkout");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Price amount={unit} compareAt={compareAt > unit ? compareAt : null} currency={currency} locale={locale} size="lg" />
        {off > 0 ? <Badge tone="accent">Save {off}%</Badge> : null}
      </div>

      {optionNames.map((name) => (
        <fieldset key={name}>
          <legend className="mb-2.5 text-sm">
            <span className="font-medium text-ink">{name}</span>
            {selection[name] ? <span className="text-muted">: {selection[name]}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {valuesFor(name).map((value) => {
              const active = selection[name] === value;
              const inStock = valueAvailable(name, value);
              const exists = valueExists(name, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(name, value)}
                  className={cn(
                    "relative min-w-12 rounded-sm px-3.5 py-2 text-[13px] font-medium ring-1 transition",
                    active ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line hover:ring-ink/50",
                    (!inStock || !exists) && !active && "text-subtle line-through decoration-subtle",
                  )}
                >
                  {value}
                  {!inStock ? <span className="sr-only"> (out of stock)</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div aria-live="polite" className="text-sm">
        {!selected ? (
          <span className="text-muted">This combination is not available.</span>
        ) : state === "out_of_stock" ? (
          <span className="font-medium text-danger">Out of stock</span>
        ) : state === "low_stock" ? (
          <span className="font-medium text-warning">Only {available} left in stock</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-success">
            <Check className="size-4" aria-hidden /> In stock, ready to ship
          </span>
        )}
        {selected?.sku ? <span className="ml-3 text-xs text-subtle">SKU {selected.sku}</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} max={Math.max(available, 1)} onChange={setQuantity} disabled={!selected || available <= 0 || pending} />
        <Button size="lg" variant="dark" className="flex-1 sm:flex-none" disabled={!selected || available <= 0} loading={pending} onClick={() => add(false)}>
          {!pending ? <ShoppingBag aria-hidden /> : null}
          Add to cart
        </Button>
        <Button size="lg" className="flex-1 sm:flex-none" disabled={!selected || available <= 0 || pending} onClick={() => add(true)}>
          <Zap aria-hidden /> Buy now
        </Button>
      </div>
    </div>
  );
}

export function PurchasePanelSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Checking availability">
      <div className="skeleton h-8 w-40 rounded" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-9 w-20 rounded" />
        ))}
      </div>
      <div className="skeleton h-5 w-32 rounded" />
      <div className="flex gap-3">
        <div className="skeleton h-11 w-32 rounded" />
        <div className="skeleton h-11 w-40 rounded" />
        <div className="skeleton h-11 w-32 rounded" />
      </div>
    </div>
  );
}
