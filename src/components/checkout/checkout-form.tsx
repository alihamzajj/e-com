"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Banknote, CreditCard, Lock } from "lucide-react";
import { placeOrderAction } from "@/actions/checkout";
import { checkoutSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Checkbox, Field, FormError, Input, Textarea } from "@/components/ui/form-controls";
import { SummaryRows } from "@/components/cart/order-summary";
import { ProductImage } from "@/components/products/product-image";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Address, CartQuote } from "@/types/domain";

type FormIn = z.input<typeof checkoutSchema>;
type FormOut = z.output<typeof checkoutSchema>;

type Props = {
  idempotencyKey: string;
  quote: CartQuote;
  addresses: Address[];
  contact: { name: string; email: string; phone: string };
  codEnabled: boolean;
  onlineEnabled: boolean;
  onlineLabel: string;
  locale: string;
};

const emptyAddress = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "PK" };

function fromSaved(a: Address) {
  return {
    fullName: a.full_name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state ?? "",
    postalCode: a.postal_code ?? "",
    country: a.country,
  };
}

export function CheckoutForm({ idempotencyKey, quote, addresses, contact, codEnabled, onlineEnabled, onlineLabel, locale }: Props) {
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [addressChoice, setAddressChoice] = useState<string>(defaultAddress?.id ?? "new");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      idempotencyKey,
      contact,
      address: defaultAddress ? fromSaved(defaultAddress) : { ...emptyAddress, fullName: contact.name, phone: contact.phone },
      saveAddress: addresses.length === 0,
      shippingMethod: quote.shipping_method?.id ?? quote.shipping_methods[0]?.id ?? "",
      paymentMethod: codEnabled ? "cod" : "online",
      couponCode: quote.coupon?.valid ? quote.coupon.code : "",
      note: "",
    },
  });
  const { register, handleSubmit, control, setValue, setError, formState } = form;
  const errors = formState.errors;
  const shippingId = useWatch({ control, name: "shippingMethod" });
  const payment = useWatch({ control, name: "paymentMethod" });
  const shipping = quote.shipping_methods.find((m) => m.id === shippingId) ?? null;
  const estimatedTotal = quote.subtotal - quote.discount_total + (shipping?.price ?? 0);
  const blocked = quote.issue_count > 0 || quote.item_count === 0 || (!codEnabled && !onlineEnabled);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await placeOrderAction(values);
      // Success redirects; only failures come back here.
      if (result && !result.ok) {
        setServerError(result.error);
        for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) setError(key as FieldPath<FormIn>, { message: messages[0] });
        }
      }
    });
  });

  const err = (path: string) => {
    const parts = path.split(".");
    let node: unknown = errors;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    return (node as { message?: string } | undefined)?.message;
  };
  const a11y = (path: string) => ({ "aria-invalid": err(path) ? true : undefined, "aria-describedby": err(path) ? `${path}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <input type="hidden" {...register("idempotencyKey")} />
      <input type="hidden" {...register("couponCode")} />
      <div className="space-y-6">
        <Card className="space-y-5 p-5 md:p-6">
          <h2 className="font-semibold">1. Contact</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="contact.name" error={err("contact.name")} required className="sm:col-span-2">
              <Input id="contact.name" autoComplete="name" {...register("contact.name")} {...a11y("contact.name")} />
            </Field>
            <Field label="Email" htmlFor="contact.email" error={err("contact.email")} required>
              <Input id="contact.email" type="email" autoComplete="email" {...register("contact.email")} {...a11y("contact.email")} />
            </Field>
            <Field label="Phone" htmlFor="contact.phone" error={err("contact.phone")} required>
              <Input id="contact.phone" type="tel" autoComplete="tel" {...register("contact.phone")} {...a11y("contact.phone")} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-5 p-5 md:p-6">
          <h2 className="font-semibold">2. Delivery address</h2>
          {addresses.length > 0 ? (
            <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <legend className="sr-only">Saved addresses</legend>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md p-3 text-sm ring-1 transition",
                    addressChoice === a.id ? "bg-surface ring-ink" : "ring-line hover:ring-ink/40",
                  )}
                >
                  <input
                    type="radio"
                    name="address-choice"
                    className="mt-0.5 accent-[var(--accent)]"
                    checked={addressChoice === a.id}
                    onChange={() => {
                      setAddressChoice(a.id);
                      for (const [k, v] of Object.entries(fromSaved(a))) setValue(`address.${k}` as FieldPath<FormIn>, v, { shouldValidate: true });
                      setValue("saveAddress", false);
                    }}
                  />
                  <span>
                    <span className="font-medium">{a.label || a.full_name}</span>
                    <span className="block text-muted">
                      {a.line1}, {a.city}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md p-3 text-sm ring-1 transition",
                  addressChoice === "new" ? "bg-surface ring-ink" : "ring-line hover:ring-ink/40",
                )}
              >
                <input
                  type="radio"
                  name="address-choice"
                  className="accent-[var(--accent)]"
                  checked={addressChoice === "new"}
                  onChange={() => {
                    setAddressChoice("new");
                    for (const [k, v] of Object.entries({ ...emptyAddress, fullName: contact.name, phone: contact.phone }))
                      setValue(`address.${k}` as FieldPath<FormIn>, v);
                  }}
                />
                <span className="font-medium">Use a new address</span>
              </label>
            </fieldset>
          ) : null}

          <div className={cn("grid gap-4 sm:grid-cols-2", addressChoice !== "new" && "hidden")}>
            <Field label="Recipient name" htmlFor="address.fullName" error={err("address.fullName")} required>
              <Input id="address.fullName" autoComplete="shipping name" {...register("address.fullName")} {...a11y("address.fullName")} />
            </Field>
            <Field label="Recipient phone" htmlFor="address.phone" error={err("address.phone")} required>
              <Input id="address.phone" type="tel" autoComplete="shipping tel" {...register("address.phone")} {...a11y("address.phone")} />
            </Field>
            <Field label="Address" htmlFor="address.line1" error={err("address.line1")} required className="sm:col-span-2">
              <Input id="address.line1" autoComplete="shipping address-line1" {...register("address.line1")} {...a11y("address.line1")} />
            </Field>
            <Field label="Apartment, suite (optional)" htmlFor="address.line2" error={err("address.line2")} className="sm:col-span-2">
              <Input id="address.line2" autoComplete="shipping address-line2" {...register("address.line2")} />
            </Field>
            <Field label="City" htmlFor="address.city" error={err("address.city")} required>
              <Input id="address.city" autoComplete="shipping address-level2" {...register("address.city")} {...a11y("address.city")} />
            </Field>
            <Field label="Province / state" htmlFor="address.state" error={err("address.state")}>
              <Input id="address.state" autoComplete="shipping address-level1" {...register("address.state")} />
            </Field>
            <Field label="Postal code" htmlFor="address.postalCode" error={err("address.postalCode")}>
              <Input id="address.postalCode" autoComplete="shipping postal-code" {...register("address.postalCode")} />
            </Field>
            <Field label="Country code" htmlFor="address.country" error={err("address.country")} hint="Two letters, e.g. PK">
              <Input id="address.country" maxLength={2} autoComplete="shipping country" {...register("address.country")} {...a11y("address.country")} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
              <Checkbox {...register("saveAddress")} /> Save this address to my account
            </label>
          </div>
          {addressChoice !== "new" && Object.keys(errors.address ?? {}).length > 0 ? (
            <FormError message="The saved address is incomplete. Choose “Use a new address” to fix it." />
          ) : null}
        </Card>

        <Card className="space-y-4 p-5 md:p-6">
          <h2 className="font-semibold">3. Shipping method</h2>
          <fieldset className="space-y-2">
            <legend className="sr-only">Shipping method</legend>
            {quote.shipping_methods.map((m) => (
              <label
                key={m.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md p-3 text-sm ring-1",
                  shippingId === m.id ? "bg-surface ring-ink" : "ring-line hover:ring-ink/40",
                )}
              >
                <span className="flex items-center gap-3">
                  <input type="radio" value={m.id} className="accent-[var(--accent)]" {...register("shippingMethod")} />
                  <span>
                    <span className="font-medium">{m.label}</span>
                    {m.eta ? <span className="block text-xs text-muted">{m.eta}</span> : null}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{m.price === 0 ? "Free" : formatMoney(m.price, quote.currency, locale)}</span>
              </label>
            ))}
          </fieldset>
          {err("shippingMethod") ? <p className="text-xs text-danger">{err("shippingMethod")}</p> : null}
        </Card>

        <Card className="space-y-4 p-5 md:p-6">
          <h2 className="font-semibold">4. Payment</h2>
          <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <legend className="sr-only">Payment method</legend>
            {codEnabled ? (
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-md p-3 text-sm ring-1", payment === "cod" ? "bg-surface ring-ink" : "ring-line hover:ring-ink/40")}>
                <input type="radio" value="cod" className="mt-0.5 accent-[var(--accent)]" {...register("paymentMethod")} />
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    <Banknote className="size-4" aria-hidden /> Cash on delivery
                  </span>
                  <span className="block text-xs text-muted">Pay in cash when your order arrives.</span>
                </span>
              </label>
            ) : null}
            {onlineEnabled ? (
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-md p-3 text-sm ring-1", payment === "online" ? "bg-surface ring-ink" : "ring-line hover:ring-ink/40")}>
                <input type="radio" value="online" className="mt-0.5 accent-[var(--accent)]" {...register("paymentMethod")} />
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    <CreditCard className="size-4" aria-hidden /> {onlineLabel}
                  </span>
                  <span className="block text-xs text-muted">You will be redirected to a secure payment page.</span>
                </span>
              </label>
            ) : null}
          </fieldset>
          {!codEnabled && !onlineEnabled ? <FormError message="No payment method is available right now. Please contact us." /> : null}
          <Field label="Order note (optional)" htmlFor="note" error={err("note")}>
            <Textarea id="note" maxLength={500} placeholder="Delivery instructions, landmarks…" {...register("note")} />
          </Field>
        </Card>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <Card className="space-y-5 p-5">
          <h2 className="font-semibold">Order summary</h2>
          <ul className="space-y-3">
            {quote.lines.map((l) => (
              <li key={l.variant_id} className="flex items-center gap-3 text-sm">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-line-soft">
                  <ProductImage src={l.image_url} alt="" fill sizes="56px" />
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    {l.quantity}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.product_name}</span>
                  {l.variant_title && l.variant_title !== "Default" ? <span className="block text-xs text-muted">{l.variant_title}</span> : null}
                  {l.issue ? <span className="block text-xs text-danger">Unavailable in this quantity</span> : null}
                </span>
                <span className="tabular-nums">{formatMoney(l.line_total, quote.currency, locale)}</span>
              </li>
            ))}
          </ul>
          <SummaryRows
            subtotal={quote.subtotal}
            discount={quote.discount_total}
            shipping={shipping?.price ?? null}
            shippingLabel={shipping?.label}
            total={estimatedTotal}
            currency={quote.currency}
            locale={locale}
            couponCode={quote.coupon?.valid ? quote.coupon.code : null}
          />
          {quote.issue_count > 0 ? (
            <FormError message="Some items are no longer available in the requested quantity. Update your cart to continue." />
          ) : null}
          <FormError message={serverError} />
          <Button type="submit" size="lg" className="w-full" loading={pending} disabled={blocked}>
            <Lock aria-hidden /> {payment === "online" ? "Continue to payment" : "Place order"}
          </Button>
          <p className="text-center text-xs text-muted">
            Totals are confirmed by our server when you place the order. <Link href="/cart" className="underline">Edit cart</Link>
          </p>
        </Card>
      </aside>
    </form>
  );
}
