"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { updateProfileAction } from "@/actions/account";
import { profileSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form-controls";

type Values = z.input<typeof profileSchema>;

export function ProfileForm({ defaults, email }: { defaults: Values; email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const result = await updateProfileAction({ fullName: values.fullName, phone: values.phone, marketingOptIn: values.marketingOptIn });
          if (result.ok) {
            toast.success(result.message ?? "Saved.");
            setError(null);
          } else setError(result.error);
        }),
      )}
    >
      <Field label="Full name" htmlFor="fullName" error={e.fullName?.message} required>
        <Input id="fullName" autoComplete="name" {...register("fullName")} aria-invalid={e.fullName ? true : undefined} />
      </Field>
      <Field label="Phone" htmlFor="phone" error={e.phone?.message}>
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} aria-invalid={e.phone ? true : undefined} />
      </Field>
      <Field label="Email" htmlFor="email" hint="Contact support to change your sign-in email." className="sm:col-span-2">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
        <Checkbox {...register("marketingOptIn")} /> Email me about restocks and new products
      </label>
      <div className="space-y-3 sm:col-span-2">
        <FormError message={error} />
        <Button type="submit" variant="dark" loading={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
