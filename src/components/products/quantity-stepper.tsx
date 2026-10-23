"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
};

export function QuantityStepper({ value, min = 1, max, onChange, disabled, label = "Quantity", size = "md" }: Props) {
  const h = size === "sm" ? "h-9" : "h-11";
  const btn = cn("inline-flex w-9 items-center justify-center text-ink transition hover:bg-surface disabled:opacity-30", h);
  return (
    <div className={cn("inline-flex items-stretch overflow-hidden rounded-sm border border-line bg-card", disabled && "opacity-60")}>
      <button type="button" className={btn} aria-label={`Decrease ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (Number.isFinite(n)) onChange(Math.min(Math.max(n, min), Math.max(max, min)));
        }}
        className={cn("w-12 border-x border-line text-center text-sm tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none", h)}
      />
      <button type="button" className={btn} aria-label={`Increase ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
