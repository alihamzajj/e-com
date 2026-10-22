"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { addOrderNoteAction, recordCodPaymentAction, recordRefundAction, updateOrderStatusAction } from "@/actions/admin/orders";
import { formatMoney, ORDER_STATUS_LABELS } from "@/lib/utils/format";
import type { ActionResult } from "@/lib/errors";
import type { OrderStatus } from "@/types/domain";

type Props = {
  orderId: string;
  status: OrderStatus;
  paymentMethod: "cod" | "online";
  paymentStatus: string;
  total: number;
  refundable: number;
  currency: string;
  locale: string;
  nextStatuses: OrderStatus[];
  hasGateway: boolean;
};

function useRun() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Saved.");
        done?.();
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

function StatusDialog({ orderId, status, nextStatuses }: Pick<Props, "orderId" | "status" | "nextStatuses">) {
  const [open, setOpen] = React.useState(false);
  const [to, setTo] = React.useState<OrderStatus | "">(nextStatuses[0] ?? "");
  const [note, setNote] = React.useState("");
  const [tracking, setTracking] = React.useState("");
  const [trackingUrl, setTrackingUrl] = React.useState("");
  const { pending, run } = useRun();
  if (nextStatuses.length === 0) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="dark">Update status</Button>
      </DialogTrigger>
      <DialogContent title="Update order status" description={`Currently ${ORDER_STATUS_LABELS[status]}. Only valid next steps are listed.`}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!to) return;
            run(
              () => updateOrderStatusAction({ orderId, status: to, note, trackingNumber: tracking, trackingUrl }),
              () => setOpen(false),
            );
          }}
        >
          <Field label="New status" htmlFor="new-status">
            <NativeSelect id="new-status" value={to} onChange={(e) => setTo(e.target.value as OrderStatus)}>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
              ))}
            </NativeSelect>
          </Field>
          {to === "cancelled" || to === "returned" ? (
            <p className="rounded-sm bg-warning-soft px-3 py-2 text-xs text-warning">
              Stock for every item is returned to inventory{to === "cancelled" ? " and any coupon use is released" : ""}. Refunds are recorded separately.
            </p>
          ) : null}
          {to === "shipped" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tracking number" htmlFor="tracking"><Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={100} /></Field>
              <Field label="Tracking URL" htmlFor="tracking-url"><Input id="tracking-url" type="url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://" /></Field>
            </div>
          ) : null}
          <Field label="Note (shown in history)" htmlFor="status-note">
            <Textarea id="status-note" className="min-h-16" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={pending} variant={to === "cancelled" ? "danger" : "primary"}>
              Mark {to ? ORDER_STATUS_LABELS[to].toLowerCase() : ""}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CodPaymentDialog({ orderId, total, currency, locale }: Pick<Props, "orderId" | "total" | "currency" | "locale">) {
  const [open, setOpen] = React.useState(false);
  const { pending, run } = useRun();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Record cash payment</Button>
      </DialogTrigger>
      <DialogContent title="Record cash on delivery payment" description="Confirm the courier or customer paid the full order total in cash.">
        <p className="mb-4 text-sm">Amount collected: <strong>{formatMoney(total, currency, locale)}</strong></p>
        <div className="flex justify-end">
          <Button loading={pending} onClick={() => run(() => recordCodPaymentAction(orderId, total), () => setOpen(false))}>
            Confirm payment received
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({ orderId, refundable, currency, locale, paymentMethod, hasGateway }: Pick<Props, "orderId" | "refundable" | "currency" | "locale" | "paymentMethod" | "hasGateway">) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(refundable));
  const [reason, setReason] = React.useState("");
  const { pending, run } = useRun();
  const value = Number(amount);
  const valid = value > 0 && value <= refundable && reason.trim().length >= 3;
  const online = paymentMethod === "online";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Refund</Button>
      </DialogTrigger>
      <DialogContent
        title={online ? "Refund through the payment gateway" : "Record a cash refund"}
        description={
          online
            ? "The gateway issues the refund to the customer's card. It is recorded only after the gateway confirms."
            : "Record money you have returned to the customer outside the store (cash or bank transfer)."
        }
      >
        {online && !hasGateway ? (
          <p className="text-sm text-danger">The payment gateway is not configured on the server, so online refunds are unavailable.</p>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) run(() => recordRefundAction({ orderId, amount: value, reason }), () => setOpen(false));
            }}
          >
            <Field label={`Amount (max ${formatMoney(refundable, currency, locale)})`} htmlFor="refund-amount" error={amount && !(value > 0 && value <= refundable) ? "Enter an amount up to the refundable balance." : undefined}>
              <Input id="refund-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Reason" htmlFor="refund-reason" required>
              <Textarea id="refund-reason" className="min-h-16" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="danger" loading={pending} disabled={!valid}>
                {online ? "Issue refund" : "Record refund"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OrderActions(props: Props) {
  const canCod = props.paymentMethod === "cod" && props.paymentStatus === "unpaid" && !["cancelled", "returned"].includes(props.status);
  const canRefund = props.refundable > 0;
  const awaitingOnline = props.paymentMethod === "online" && !["paid", "partially_refunded", "refunded"].includes(props.paymentStatus);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <StatusDialog orderId={props.orderId} status={props.status} nextStatuses={props.nextStatuses} />
        {canCod ? <CodPaymentDialog {...props} /> : null}
        {canRefund ? <RefundDialog {...props} /> : null}
      </div>
      {awaitingOnline ? (
        <p className="flex items-start gap-2 rounded-sm bg-info-soft px-3 py-2 text-xs text-info">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Online payment not verified yet. It can only be marked paid by a signed gateway webhook; the order cannot be confirmed or shipped until then.
        </p>
      ) : null}
      {props.nextStatuses.length === 0 ? <p className="text-xs text-muted">This order is in a final state.</p> : null}
    </div>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const [body, setBody] = React.useState("");
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) run(() => addOrderNoteAction(orderId, body), () => setBody(""));
      }}
    >
      <label htmlFor="order-note" className="sr-only">Internal note</label>
      <Textarea id="order-note" className="min-h-16" placeholder="Internal note — never shown to the customer" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
      <div className="flex justify-end">
        <Button size="sm" type="submit" loading={pending} disabled={!body.trim()}>Add note</Button>
      </div>
    </form>
  );
}
