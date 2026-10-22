"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-in" />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-card p-6 shadow-[var(--shadow-pop)]",
          className,
        )}
        {...props}
      >
        <div className="mb-4 pr-8">
          <D.Title className="text-base font-semibold text-ink">{title}</D.Title>
          {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        </div>
        {children}
        <D.Close className="absolute top-4 right-4 rounded-sm p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

/** Slide-in panel (mobile nav, filters, cart). */
export function SheetContent({
  className,
  children,
  title,
  side = "right",
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; side?: "left" | "right" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/40" />
      <D.Content
        className={cn(
          "fixed top-0 z-50 flex h-dvh w-[88vw] max-w-sm flex-col bg-card shadow-[var(--shadow-pop)]",
          side === "right" ? "right-0" : "left-0",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
          <D.Title className="text-sm font-semibold">{title}</D.Title>
          <D.Description className="sr-only">{title}</D.Description>
          <D.Close className="rounded-sm p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
