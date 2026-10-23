import Link from "next/link";
import type * as React from "react";
import { Badge, Card, Skeleton } from "@/components/ui/primitives";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "dark";

const ORDER_TONES: Record<string, Tone> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "dark",
  delivered: "success",
  cancelled: "neutral",
  returned: "danger",
};

const PAYMENT_TONES: Record<string, Tone> = {
  unpaid: "neutral",
  pending: "warning",
  paid: "success",
  failed: "danger",
  partially_refunded: "info",
  refunded: "info",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={ORDER_TONES[status] ?? "neutral"}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge tone={PAYMENT_TONES[status] ?? "neutral"}>{PAYMENT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function ProductStatusBadge({ status }: { status: string }) {
  const tone: Tone = status === "active" ? "success" : status === "draft" ? "warning" : "neutral";
  return <Badge tone={tone} className="capitalize">{status}</Badge>;
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "accent" | "warning";
  href?: string;
}) {
  const body = (
    <Card className={cn("h-full p-4 transition-colors", href && "hover:border-line")}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 text-xl font-semibold tabular-nums tracking-tight md:text-2xl",
          tone === "accent" && "text-accent-strong",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Card className="divide-y divide-line-soft">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-60" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

/** GET form for list filters: works without JavaScript and keeps URLs shareable. */
export function FilterBar({ action, children }: { action: string; children: React.ReactNode }) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-line-soft bg-card p-3">
      {children}
      <button className="h-9 rounded-sm bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft">Apply</button>
      <Link href={action} className="inline-flex h-9 items-center px-2 text-sm text-muted hover:text-ink">
        Reset
      </Link>
    </form>
  );
}

export function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1 text-xs text-muted", className)}>
      {label}
      {children}
    </label>
  );
}

export const filterInput =
  "h-9 rounded-sm border border-line bg-card px-2.5 text-sm text-ink focus:border-ink focus:outline-none";

export function AccessDenied({ section }: { section: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="font-semibold">You do not have access to {section}.</p>
      <p className="mt-1 text-sm text-muted">Ask an administrator to grant the permission.</p>
    </Card>
  );
}
