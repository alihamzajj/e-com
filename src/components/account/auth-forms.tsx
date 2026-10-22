"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, type FieldPath, type FieldValues, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { MailCheck } from "lucide-react";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction } from "@/actions/auth";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form-controls";
import type { ActionResult } from "@/lib/errors";

function applyFieldErrors<T extends FieldValues>(result: ActionResult<unknown>, setError: UseFormSetError<T>) {
  if (result.ok) return;
  for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
    if (messages?.[0]) setError(key as FieldPath<T>, { message: messages[0] });
  }
}

const invalid = (msg?: string, id?: string) => (msg ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {});

export function SignInForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const [error, setErrorMsg] = useState<string | null>(linkError ? "That link is invalid or has expired. Please try again." : null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<z.input<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const result = await signInAction({ ...values, next });
          if (result && !result.ok) setErrorMsg(result.error);
        }),
      )}
    >
      <Field label="Email" htmlFor="email" error={e.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} {...invalid(e.email?.message, "email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={e.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} {...invalid(e.password?.message, "password")} />
      </Field>
      <div className="text-right">
        <Link href="/forgot-password" className="text-xs text-muted hover:text-ink">
          Forgot password?
        </Link>
      </div>
      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const [error, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError } = useForm<z.input<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema) });
  const e = formState.errors;
  if (done) {
    return (
      <div role="status" className="space-y-3 text-center">
        <MailCheck className="mx-auto size-10 text-success" aria-hidden />
        <p className="font-semibold">Check your inbox</p>
        <p className="text-sm text-muted">We sent a confirmation link. Open it to activate your account, then sign in.</p>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const result = await signUpAction(values);
          if (!result) return;
          if (result.ok) setDone(true);
          else {
            setErrorMsg(result.error);
            applyFieldErrors(result, setError);
          }
        }),
      )}
    >
      <Field label="Full name" htmlFor="fullName" error={e.fullName?.message}>
        <Input id="fullName" autoComplete="name" {...register("fullName")} {...invalid(e.fullName?.message, "fullName")} />
      </Field>
      <Field label="Email" htmlFor="email" error={e.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} {...invalid(e.email?.message, "email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={e.password?.message} hint="At least 8 characters with a letter and a number.">
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} {...invalid(e.password?.message, "password")} />
      </Field>
      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Create account
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<z.input<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema) });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const result = await forgotPasswordAction(values);
          setMessage(result.ok ? { ok: true, text: result.message ?? "Check your inbox." } : { ok: false, text: result.error });
        }),
      )}
    >
      <Field label="Email" htmlFor="email" error={e.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} {...invalid(e.email?.message, "email")} />
      </Field>
      {message?.ok ? (
        <p role="status" className="rounded-sm bg-success-soft px-3 py-2 text-sm text-success">
          {message.text}
        </p>
      ) : (
        <FormError message={message?.text} />
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [error, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState, setError } = useForm<z.input<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema) });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const result = await resetPasswordAction(values);
          if (result && !result.ok) {
            setErrorMsg(result.error);
            applyFieldErrors(result, setError);
          }
        }),
      )}
    >
      <Field label="New password" htmlFor="password" error={e.password?.message} hint="At least 8 characters with a letter and a number.">
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} {...invalid(e.password?.message, "password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={e.confirm?.message}>
        <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} {...invalid(e.confirm?.message, "confirm")} />
      </Field>
      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
