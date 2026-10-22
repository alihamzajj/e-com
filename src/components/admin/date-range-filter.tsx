"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { RANGE_PRESETS, type RangePreset } from "@/features/admin/date-range";
import { cn } from "@/lib/utils/cn";

type Props = { basePath: string; preset: RangePreset; fromDate: string; toDate: string; timezone: string };

export function DateRangeFilter({ basePath, preset, fromDate, toDate, timezone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [from, setFrom] = React.useState(fromDate);
  const [to, setTo] = React.useState(toDate);
  const [showCustom, setShowCustom] = React.useState(preset === "custom");

  const go = (params: Record<string, string>) =>
    startTransition(() => router.push(`${basePath}?${new URLSearchParams(params).toString()}`, { scroll: false }));

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 rounded-md border border-line-soft bg-card p-1">
        {RANGE_PRESETS.map((p) => {
          const active = p.id === "custom" ? showCustom : !showCustom && p.id === preset;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (p.id === "custom") setShowCustom(true);
                else {
                  setShowCustom(false);
                  go({ range: p.id });
                }
              }}
              className={cn(
                "h-8 rounded-sm px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-surface",
                active && "bg-ink text-white hover:bg-ink",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {showCustom ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to && from <= to) go({ range: "custom", from, to });
          }}
        >
          <CalendarRange className="size-4 text-muted" aria-hidden />
          <label className="sr-only" htmlFor="range-from">From</label>
          <input id="range-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded-sm border border-line bg-card px-2 text-xs" />
          <span className="text-xs text-muted">to</span>
          <label className="sr-only" htmlFor="range-to">To</label>
          <input id="range-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded-sm border border-line bg-card px-2 text-xs" />
          <button className="h-8 rounded-sm bg-ink px-3 text-xs font-medium text-white disabled:opacity-50" disabled={!from || !to || from > to}>
            Apply
          </button>
        </form>
      ) : null}
      <span className="text-xs text-muted">Times in {timezone}</span>
      {pending ? <span className="text-xs text-muted">Updating…</span> : null}
    </div>
  );
}
