"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Checkbox, Field, FormError, Input, Textarea } from "@/components/ui/form-controls";
import { settingsSchema } from "@/lib/validation/schemas";
import { saveSettingsAction, uploadSettingsImageAction } from "@/actions/admin/settings";

type In = z.input<typeof settingsSchema>;
type Out = z.output<typeof settingsSchema>;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="grid gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (url: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [pending, start] = React.useTransition();
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-md bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="size-full object-cover" /> : null}
        </div>
        <Input aria-label={`${label} URL`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" className="min-w-0 flex-1" />
        <input
          ref={ref}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          aria-label={`Upload ${label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) return void toast.error("Images must be 4 MB or smaller.");
            const fd = new FormData();
            fd.append("file", file);
            start(async () => {
              const r = await uploadSettingsImageAction(fd);
              if (r.ok) {
                onChange(r.data.url);
                toast.success(r.message ?? "Uploaded.");
              } else toast.error(r.error);
            });
          }}
        />
        <Button type="button" variant="outline" size="icon" loading={pending} aria-label={`Upload ${label}`} onClick={() => ref.current?.click()}>
          {pending ? null : <ImagePlus />}
        </Button>
      </div>
    </div>
  );
}

export function SettingsForm({ initial, gatewayConfigured }: { initial: In; gatewayConfigured: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, setValue, formState } = useForm<In, unknown, Out>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initial,
  });
  const methods = useFieldArray({ control, name: "shippingMethods" });
  const e = formState.errors;
  const online = useWatch({ control, name: "onlinePaymentsEnabled" });
  const images = useWatch({ control, name: ["logoUrl", "hero.image_url", "promo.image_url"] });
  const imageValues: Record<string, string | undefined> = {
    logoUrl: images[0],
    "hero.image_url": images[1],
    "promo.image_url": images[2],
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      const r = await saveSettingsAction(values);
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      toast.success(r.message ?? "Saved.");
      router.refresh();
    },
    () => setError("Please fix the highlighted fields."),
  );

  const image = (name: Path<In>, label: string) => (
    <ImageField label={label} value={imageValues[name]} onChange={(url) => setValue(name, url as never, { shouldDirty: true })} />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormError message={error} />
      <Section title="Brand" description="Shown in the header, emails and page titles.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Store name" htmlFor="storeName" required error={e.storeName?.message}>
            <Input id="storeName" {...register("storeName")} />
          </Field>
          <Field label="Tagline" htmlFor="tagline" error={e.tagline?.message}>
            <Input id="tagline" {...register("tagline")} />
          </Field>
        </div>
        {image("logoUrl", "Logo")}
      </Section>

      <Section title="Region" description="Currency and time zone used across the store and reports.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Currency" htmlFor="currency" error={e.currency?.message} hint="ISO code, e.g. PKR, USD">
            <Input id="currency" className="uppercase" maxLength={3} {...register("currency")} />
          </Field>
          <Field label="Locale" htmlFor="locale" error={e.locale?.message} hint="e.g. en-PK">
            <Input id="locale" {...register("locale")} />
          </Field>
          <Field label="Time zone" htmlFor="timezone" error={e.timezone?.message} hint="IANA name, e.g. Asia/Karachi">
            <Input id="timezone" {...register("timezone")} />
          </Field>
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="contactEmail" error={e.contactEmail?.message}>
            <Input id="contactEmail" type="email" {...register("contactEmail")} />
          </Field>
          <Field label="Phone" htmlFor="contactPhone" error={e.contactPhone?.message}>
            <Input id="contactPhone" {...register("contactPhone")} />
          </Field>
        </div>
        <Field label="Address" htmlFor="contactAddress" error={e.contactAddress?.message}>
          <Textarea id="contactAddress" className="min-h-16" {...register("contactAddress")} />
        </Field>
      </Section>

      <Section title="Shipping" description="Prices are charged per order. Orders at or above the free-shipping threshold ship free.">
        {e.shippingMethods?.message || e.shippingMethods?.root?.message ? (
          <p role="alert" className="text-xs text-danger">{e.shippingMethods?.message ?? e.shippingMethods?.root?.message}</p>
        ) : null}
        <div className="grid gap-3">
          {methods.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr_120px_1fr_auto]">
              <Input aria-label="Method id" placeholder="id" {...register(`shippingMethods.${i}.id`)} aria-invalid={Boolean(e.shippingMethods?.[i]?.id)} />
              <Input aria-label="Label" placeholder="Label" {...register(`shippingMethods.${i}.label`)} aria-invalid={Boolean(e.shippingMethods?.[i]?.label)} />
              <Input aria-label="Price" placeholder="Price" inputMode="decimal" {...register(`shippingMethods.${i}.price`)} aria-invalid={Boolean(e.shippingMethods?.[i]?.price)} />
              <Input aria-label="Delivery estimate" placeholder="e.g. 3–5 business days" {...register(`shippingMethods.${i}.eta`)} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove method" disabled={methods.fields.length === 1} onClick={() => methods.remove(i)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => methods.append({ id: "", label: "", price: 0, eta: "" })} disabled={methods.fields.length >= 10}>
            <Plus /> Add method
          </Button>
        </div>
        <Field label="Free shipping threshold" htmlFor="freeShippingThreshold" error={e.freeShippingThreshold?.message} hint="Order subtotal after discounts. Leave empty to disable.">
          <Input id="freeShippingThreshold" inputMode="decimal" className="max-w-48" {...register("freeShippingThreshold")} />
        </Field>
      </Section>

      <Section title="Payments & notifications">
        <label className="flex items-center gap-2 text-sm"><Checkbox {...register("codEnabled")} /> Cash on delivery</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox {...register("onlinePaymentsEnabled")} /> Online payments</label>
        {online && !gatewayConfigured ? (
          <p className="flex items-start gap-2 rounded-sm bg-warning-soft px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            No payment gateway is configured on the server (PAYMENT_PROVIDER and its keys). Customers will not be able to pay online until it is set up.
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm"><Checkbox {...register("newsletterEnabled")} /> Newsletter sign-up on the storefront</label>
        <Field label="Low-stock alert email" htmlFor="lowStockAlertEmail" error={e.lowStockAlertEmail?.message} hint="Optional. Receives an email when a purchase leaves a variant at or below its threshold.">
          <Input id="lowStockAlertEmail" type="email" className="max-w-md" {...register("lowStockAlertEmail")} />
        </Field>
      </Section>

      <Section title="Home page hero">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Headline" htmlFor="hero-title"><Input id="hero-title" {...register("hero.title")} /></Field>
          <Field label="Button label" htmlFor="hero-cta"><Input id="hero-cta" {...register("hero.cta_label")} /></Field>
        </div>
        <Field label="Subtitle" htmlFor="hero-subtitle"><Textarea id="hero-subtitle" className="min-h-16" {...register("hero.subtitle")} /></Field>
        <Field label="Button link" htmlFor="hero-href" hint="e.g. /products"><Input id="hero-href" {...register("hero.cta_href")} /></Field>
        {image("hero.image_url", "Hero image")}
      </Section>

      <Section title="Promotional banner">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Eyebrow" htmlFor="promo-eyebrow"><Input id="promo-eyebrow" {...register("promo.eyebrow")} /></Field>
          <Field label="Title" htmlFor="promo-title"><Input id="promo-title" {...register("promo.title")} /></Field>
        </div>
        <Field label="Body" htmlFor="promo-body"><Textarea id="promo-body" className="min-h-16" {...register("promo.body")} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Button label" htmlFor="promo-cta"><Input id="promo-cta" {...register("promo.cta_label")} /></Field>
          <Field label="Button link" htmlFor="promo-href"><Input id="promo-href" {...register("promo.cta_href")} /></Field>
        </div>
        {image("promo.image_url", "Banner image")}
      </Section>

      <Section title="Policies" description="Plain text, shown on the policy pages and linked from the footer.">
        {(["shipping", "returns", "privacy", "terms"] as const).map((k) => (
          <Field key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={`policy-${k}`} error={e.policies?.[k]?.message}>
            <Textarea id={`policy-${k}`} className="min-h-28" {...register(`policies.${k}`)} />
          </Field>
        ))}
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" loading={formState.isSubmitting} className="shadow-[var(--shadow-pop)]">Save settings</Button>
      </div>
    </form>
  );
}
