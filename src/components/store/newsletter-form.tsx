"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletterAction } from "@/actions/newsletter";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        startTransition(async () => {
          const result = await subscribeNewsletterAction({
            email: String(data.get("email") ?? ""),
            website: String(data.get("website") ?? ""),
          });
          setMessage(result.ok ? { ok: true, text: result.message ?? "Thanks for subscribing." } : { ok: false, text: result.error });
          if (result.ok) form.reset();
        });
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-12 w-full shrink-0 rounded-sm border-0 bg-white sm:w-auto sm:flex-1 px-4 text-sm text-ink placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-ink"
        />
        {/* Honeypot for bots */}
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <Button type="submit" variant="dark" size="lg" loading={pending}>
          Subscribe
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-xs text-white/90">
        {message?.text}
      </p>
    </form>
  );
}
