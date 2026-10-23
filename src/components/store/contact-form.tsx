"use client";

import { useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { submitSupportAction } from "@/actions/support";
import { supportSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/form-controls";

type Values = z.input<typeof supportSchema>;

export function ContactForm({ defaults }: { defaults: Partial<Values> }) {
  const [error, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError, reset } = useForm<Values>({
    resolver: zodResolver(supportSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", orderNumber: "", website: "", ...defaults },
  });
  const e = formState.errors;

  if (sent) {
    return (
      <div role="status" className="space-y-3 py-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <p className="font-semibold">Message sent</p>
        <p className="text-sm text-muted">{sent}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            reset();
            setSent(null);
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const result = await submitSupportAction({
            name: values.name,
            email: values.email,
            subject: values.subject,
            message: values.message,
            orderNumber: values.orderNumber,
            website: values.website,
          });
          if (result.ok) setSent(result.message ?? "Thanks.");
          else {
            setErrorMsg(result.error);
            for (const [k, m] of Object.entries(result.fieldErrors ?? {})) if (m?.[0]) setError(k as FieldPath<Values>, { message: m[0] });
          }
        }),
      )}
    >
      <Field label="Name" htmlFor="name" error={e.name?.message} required>
        <Input id="name" autoComplete="name" {...register("name")} aria-invalid={e.name ? true : undefined} />
      </Field>
      <Field label="Email" htmlFor="email" error={e.email?.message} required>
        <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={e.email ? true : undefined} />
      </Field>
      <Field label="Subject" htmlFor="subject" error={e.subject?.message} required>
        <Input id="subject" {...register("subject")} aria-invalid={e.subject ? true : undefined} />
      </Field>
      <Field label="Order number (optional)" htmlFor="orderNumber" error={e.orderNumber?.message}>
        <Input id="orderNumber" placeholder="NK-100001" {...register("orderNumber")} />
      </Field>
      <Field label="Message" htmlFor="message" error={e.message?.message} required className="sm:col-span-2">
        <Textarea id="message" rows={6} maxLength={5000} {...register("message")} aria-invalid={e.message ? true : undefined} />
      </Field>
      <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...register("website")} />
      <div className="space-y-3 sm:col-span-2">
        <FormError message={error} />
        <Button type="submit" variant="dark" size="lg" loading={pending}>
          Send message
        </Button>
      </div>
    </form>
  );
}
