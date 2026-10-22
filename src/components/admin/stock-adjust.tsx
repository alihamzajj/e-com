"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { adjustStockAction } from "@/actions/admin/products";

export function StockAdjustDialog({ variantId, label, current }: { variantId: string; label: string; current: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [change, setChange] = React.useState("");
  const [reason, setReason] = React.useState<"restock" | "adjustment">("restock");
  const [note, setNote] = React.useState("");
  const delta = Number(change);
  const valid = Number.isInteger(delta) && delta !== 0 && current + delta >= 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(async () => {
      const result = await adjustStockAction({ variantId, change: delta, reason, note: note || undefined });
      if (result.ok) {
        toast.success(result.message ?? "Stock updated.");
        setOpen(false);
        setChange("");
        setNote("");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Adjust</Button>
      </DialogTrigger>
      <DialogContent title={`Adjust stock — ${label}`} description={`Current stock: ${current}. Changes are applied atomically and logged.`}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Change" htmlFor={`chg-${variantId}`} hint="Positive to add units, negative to remove." error={change && !valid ? "Enter a whole number that keeps stock at 0 or more." : undefined}>
            <Input id={`chg-${variantId}`} inputMode="numeric" value={change} onChange={(e) => setChange(e.target.value)} placeholder="e.g. 10 or -2" autoFocus />
          </Field>
          <Field label="Reason" htmlFor={`rsn-${variantId}`}>
            <NativeSelect id={`rsn-${variantId}`} value={reason} onChange={(e) => setReason(e.target.value as "restock" | "adjustment")}>
              <option value="restock">Restock (new units received)</option>
              <option value="adjustment">Adjustment (count correction, damage…)</option>
            </NativeSelect>
          </Field>
          <Field label="Note" htmlFor={`note-${variantId}`}>
            <Textarea id={`note-${variantId}`} className="min-h-16" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">New stock: <strong className="text-ink">{valid ? current + delta : current}</strong></span>
            <Button type="submit" loading={pending} disabled={!valid}>Apply</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
