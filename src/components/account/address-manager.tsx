"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from "@/actions/account";
import { addressSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Address } from "@/types/domain";

type In = z.input<typeof addressSchema>;
type Out = z.output<typeof addressSchema>;

function toForm(a?: Address): In {
  return a
    ? {
        label: a.label ?? "",
        fullName: a.full_name,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2 ?? "",
        city: a.city,
        state: a.state ?? "",
        postalCode: a.postal_code ?? "",
        country: a.country,
        isDefault: a.is_default,
      }
    : { label: "", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "PK", isDefault: false };
}

function AddressForm({ address, onDone }: { address?: Address; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<In, unknown, Out>({ resolver: zodResolver(addressSchema), defaultValues: toForm(address) });
  const e = formState.errors;
  const inv = (m?: string) => (m ? { "aria-invalid": true as const } : {});
  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const result = await saveAddressAction({ ...values, id: address?.id });
          if (result.ok) {
            toast.success(result.message ?? "Saved.");
            onDone();
          } else setError(result.error);
        }),
      )}
    >
      <Field label="Label (optional)" htmlFor="label" hint="e.g. Home, Office" className="sm:col-span-2">
        <Input id="label" {...register("label")} />
      </Field>
      <Field label="Full name" htmlFor="fullName" error={e.fullName?.message} required>
        <Input id="fullName" autoComplete="name" {...register("fullName")} {...inv(e.fullName?.message)} />
      </Field>
      <Field label="Phone" htmlFor="phone" error={e.phone?.message} required>
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} {...inv(e.phone?.message)} />
      </Field>
      <Field label="Address" htmlFor="line1" error={e.line1?.message} required className="sm:col-span-2">
        <Input id="line1" autoComplete="address-line1" {...register("line1")} {...inv(e.line1?.message)} />
      </Field>
      <Field label="Apartment, suite (optional)" htmlFor="line2" className="sm:col-span-2">
        <Input id="line2" autoComplete="address-line2" {...register("line2")} />
      </Field>
      <Field label="City" htmlFor="city" error={e.city?.message} required>
        <Input id="city" autoComplete="address-level2" {...register("city")} {...inv(e.city?.message)} />
      </Field>
      <Field label="Province / state" htmlFor="state">
        <Input id="state" autoComplete="address-level1" {...register("state")} />
      </Field>
      <Field label="Postal code" htmlFor="postalCode">
        <Input id="postalCode" autoComplete="postal-code" {...register("postalCode")} />
      </Field>
      <Field label="Country code" htmlFor="country" error={e.country?.message}>
        <Input id="country" maxLength={2} {...register("country")} {...inv(e.country?.message)} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
        <Checkbox {...register("isDefault")} /> Use as my default address
      </label>
      <div className="space-y-3 sm:col-span-2">
        <FormError message={error} />
        <Button type="submit" variant="dark" loading={pending}>
          Save address
        </Button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message ?? "Done.");
      else toast.error(r.error ?? "Something went wrong.");
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="dark" size="sm" onClick={() => setEditing("new")}>
          <Plus aria-hidden /> Add address
        </Button>
      </div>
      {addresses.length === 0 ? (
        <Card>
          <EmptyState icon={<MapPin />} title="No saved addresses" description="Save an address to check out faster." />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{a.label || a.full_name}</p>
                  {a.is_default ? <Badge tone="success">Default</Badge> : null}
                </div>
                <address className="text-sm leading-relaxed text-ink-soft not-italic">
                  {a.full_name} · {a.phone}
                  <br />
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {[a.city, a.state, a.postal_code].filter(Boolean).join(", ")} · {a.country}
                </address>
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                    <Pencil aria-hidden /> Edit
                  </Button>
                  {!a.is_default ? (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setDefaultAddressAction(a.id))}>
                      <Star aria-hidden /> Make default
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    disabled={pending}
                    onClick={() => {
                      if (confirm("Remove this address?")) run(() => deleteAddressAction(a.id));
                    }}
                  >
                    <Trash2 aria-hidden /> Remove
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null ? (
          <DialogContent title={editing === "new" ? "Add address" : "Edit address"} className="max-w-xl">
            <AddressForm address={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
