"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CreditCard, XCircle } from "lucide-react";
import { cancelOrderAction, retryPaymentAction } from "@/actions/checkout";
import { Button } from "@/components/ui/button";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm("Cancel this order? This cannot be undone.")) return;
        startTransition(async () => {
          const r = await cancelOrderAction(orderId);
          if (r.ok) toast.success(r.message ?? "Order cancelled.");
          else toast.error(r.error);
        });
      }}
    >
      {!pending ? <XCircle aria-hidden /> : null} Cancel order
    </Button>
  );
}

export function RetryPaymentButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await retryPaymentAction(orderId);
          if (r && !r.ok) toast.error(r.error);
        })
      }
    >
      {!pending ? <CreditCard aria-hidden /> : null} Pay now
    </Button>
  );
}
