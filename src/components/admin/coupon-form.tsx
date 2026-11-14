"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Checkbox, Field, FormError, Input, NativeSelect } from "@/components/ui/form-controls";
import { couponSchema } from "@/lib/validation/schemas";
import { saveCouponAction, toggleCouponAction } from "@/actions/admin/coupons";
import { useActionRunner } from "@/components/admin/confirm-button";
import { utcToLocalInput } from "@/features/admin/date-range";
import { formatDateTime, formatMoney } from "@/lib/utils/format";

type In = z.input<typeof couponSchema>;

const noSubscribe = () => () => {};
type Out = z.output<typeof couponSchema>;

export function CouponForm({ couponId, initial, currency, timezone }: { couponId: string | null; initial: In; currency: string; timezone: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, formState, setValue } = useForm<In, unknown, Out>({ resolver: zodResolver(couponSchema), defaultValues: initial });
  const e = formState.errors;
  const type = useWatch({ control, name: "discountType" });
  const [startsAt, endsAt, value, maxDiscount, minOrderTotal] = useWatch({
    control,
    name: ["startsAt", "endsAt", "value", "maxDiscount", "minOrderTotal"],
  });
  // The store's current time as "YYYY-MM-DDTHH:mm" (null while rendering on the server).
  const now = React.useSyncExternalStore(
    noSubscribe,
    () => utcToLocalInput(new Date().toISOString(), timezone),
    () => null,
  );

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const r = await saveCouponAction(couponId, values);
    if (!r.ok) {
      setError(r.error);
      toast.error(r.error);
      return;
    }
    toast.success(r.message ?? "Saved.");
    if (!couponId) router.push(`/admin/coupons/${r.data.id}`);
    else router.refresh();
  });

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Code" htmlFor="code" required error={e.code?.message} hint="Customers type this at checkout. Case-insensitive.">
            <Input id="code" className="font-mono uppercase" aria-invalid={Boolean(e.code)} {...register("code")} />
          </Field>
          <Field label="Description" htmlFor="description" error={e.description?.message}>
            <Input id="description" {...register("description")} />
          </Field>
          <Field label="Discount type" htmlFor="discountType">
            <NativeSelect id="discountType" {...register("discountType")}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount ({currency})</option>
            </NativeSelect>
          </Field>
          <Field label={type === "percentage" ? "Percent off" : `Amount off (${currency})`} htmlFor="value" required error={e.value?.message}>
            <Input id="value" inputMode="decimal" aria-invalid={Boolean(e.value)} {...register("value")} />
          </Field>
          {type === "percentage" ? (
            <Field label={`Maximum discount (${currency})`} htmlFor="maxDiscount" error={e.maxDiscount?.message} hint="Optional cap.">
              <Input id="maxDiscount" inputMode="decimal" {...register("maxDiscount")} />
            </Field>
          ) : null}
          <Field label={`Minimum order subtotal (${currency})`} htmlFor="minOrderTotal" error={e.minOrderTotal?.message}>
            <Input id="minOrderTotal" inputMode="decimal" {...register("minOrderTotal")} />
          </Field>
          <Field label="Starts" htmlFor="startsAt" hint={`Optional. Store time (${timezone}).`}>
            <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
          </Field>
          <Field label="Expires" htmlFor="endsAt" error={e.endsAt?.message} hint="Optional.">
            <Input id="endsAt" type="datetime-local" {...register("endsAt")} />
          </Field>
          <Field label="Total usage limit" htmlFor="usageLimit" error={e.usageLimit?.message} hint="Leave empty for unlimited.">
            <Input id="usageLimit" inputMode="numeric" {...register("usageLimit")} />
          </Field>
          <Field label="Uses per customer" htmlFor="perCustomerLimit" error={e.perCustomerLimit?.message}>
            <Input id="perCustomerLimit" inputMode="numeric" {...register("perCustomerLimit")} />
          </Field>
        </div>
        <CouponChecks
          now={now}
          startsAt={startsAt ? String(startsAt) : ""}
          endsAt={endsAt ? String(endsAt) : ""}
          percentage={type === "percentage"}
          value={Number(value)}
          maxDiscount={maxDiscount === "" || maxDiscount == null ? null : Number(maxDiscount)}
          minOrderTotal={Number(minOrderTotal) || 0}
          currency={currency}
          onStartNow={() => setValue("startsAt", "", { shouldDirty: true })}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox {...register("isActive")} /> Active
        </label>
        <div>
          <Button type="submit" loading={formState.isSubmitting}>{couponId ? "Save coupon" : "Create coupon"}</Button>
        </div>
      </form>
    </Card>
  );
}

/** "YYYY-MM-DDTHH:mm" store time → "14-Nov-2026, 6:43 pm". */
function showLocal(value: string) {
  const [d, t] = value.split("T");
  const [y, mo, day] = d.split("-").map(Number);
  const [h, mi] = (t ?? "00:00").split(":").map(Number);
  return formatDateTime(new Date(Date.UTC(y, mo - 1, day, h, mi)), "UTC");
}

/**
 * Plain-language checks shown while the coupon is edited: a start time still
 * ahead, an expiry already past, and what a typical order would actually get
 * off (so a tiny maximum discount is obvious before customers notice).
 */
function CouponChecks({
  now,
  startsAt,
  endsAt,
  percentage,
  value,
  maxDiscount,
  minOrderTotal,
  currency,
  onStartNow,
}: {
  now: string | null;
  startsAt: string;
  endsAt: string;
  percentage: boolean;
  value: number;
  maxDiscount: number | null;
  minOrderTotal: number;
  currency: string;
  onStartNow: () => void;
}) {
  const notStarted = now !== null && startsAt !== "" && startsAt > now;
  const expired = now !== null && endsAt !== "" && endsAt <= now;
  const example = Math.max(minOrderTotal, 5000);
  const uncapped = percentage ? (example * value) / 100 : value;
  const cap = percentage && maxDiscount !== null ? maxDiscount : Infinity;
  const off = Number.isFinite(uncapped) && uncapped > 0 ? Math.min(uncapped, example, cap) : 0;
  const capped = cap < uncapped;
  const money = (n: number) => formatMoney(n, currency);
  if (!notStarted && !expired && off <= 0) return null;
  return (
    <div className="grid gap-2 text-sm">
      {notStarted ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-warning-soft px-3 py-2 text-warning">
          <span>Not working yet: this coupon starts on {showLocal(startsAt)}. Until then customers are told it isn&apos;t active.</span>
          <Button type="button" size="sm" variant="outline" onClick={onStartNow}>
            Start now instead
          </Button>
        </div>
      ) : null}
      {expired ? (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-danger">
          This expiry time has already passed, so the coupon won&apos;t work. Clear it or pick a later date.
        </p>
      ) : null}
      {off > 0 ? (
        <p className={capped ? "rounded-md bg-warning-soft px-3 py-2 text-warning" : "rounded-md bg-surface px-3 py-2 text-ink-soft"}>
          Example: an order of {money(example)} gets <strong>{money(off)}</strong> off
          {capped ? <>, because the maximum discount is {money(cap)} (without it, {money(uncapped)}).</> : "."}
        </p>
      ) : null}
    </div>
  );
}

export function CouponToggle({ couponId, isActive }: { couponId: string; isActive: boolean }) {
  const { pending, run } = useActionRunner();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => toggleCouponAction(couponId, !isActive))}>
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
