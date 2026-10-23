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

type In = z.input<typeof couponSchema>;
type Out = z.output<typeof couponSchema>;

export function CouponForm({ couponId, initial, currency, timezone }: { couponId: string | null; initial: In; currency: string; timezone: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, formState } = useForm<In, unknown, Out>({ resolver: zodResolver(couponSchema), defaultValues: initial });
  const e = formState.errors;
  const type = useWatch({ control, name: "discountType" });

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

export function CouponToggle({ couponId, isActive }: { couponId: string; isActive: boolean }) {
  const { pending, run } = useActionRunner();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => toggleCouponAction(couponId, !isActive))}>
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
