"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { applyCouponAction, removeCouponAction } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/form-controls";

type Props = { applied: { code: string; valid: boolean; error: string | null } | null; invalidMessage?: string | null };

export function CouponForm({ applied, invalidMessage }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (applied) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between rounded-sm bg-surface px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <Tag className="size-4 text-accent" aria-hidden /> {applied.code}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeCouponAction();
                router.refresh();
              })
            }
          >
            <X className="size-3" aria-hidden /> Remove
          </button>
        </div>
        {!applied.valid && invalidMessage ? <p className="text-xs text-danger">{invalidMessage}</p> : null}
      </div>
    );
  }

  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await applyCouponAction(code);
          if (result.ok) {
            toast.success(result.message ?? "Coupon applied.");
            setError(null);
            setCode("");
            router.refresh();
          } else setError(result.error);
        });
      }}
    >
      <label htmlFor="coupon" className="text-sm font-medium">
        Coupon code
      </label>
      <div className="flex gap-2">
        <Input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={32} placeholder="e.g. WELCOME10" autoComplete="off" />
        <Button type="submit" variant="outline" loading={pending} disabled={!code.trim()}>
          Apply
        </Button>
      </div>
      <FormError message={error} />
    </form>
  );
}
