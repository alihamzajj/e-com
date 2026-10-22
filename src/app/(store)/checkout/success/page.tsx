import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };

export default function CheckoutSuccessPage(props: PageProps<"/checkout/success">) {
  return (
    <div className="container-page max-w-2xl pt-12 md:pt-20">
      <Suspense fallback={<div className="skeleton h-80 rounded-lg" aria-busy />}>
        <Result searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const sp = await searchParams;
  const orderId = typeof sp.order === "string" && /^[0-9a-f-]{36}$/i.test(sp.order) ? sp.order : null;
  const user = await getSessionUser();
  if (!user || !orderId) {
    return (
      <Card className="p-8 text-center">
        <p className="mb-4 text-sm text-muted">Sign in to see your order.</p>
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(orderId ? `/account/orders/${orderId}` : "/account/orders")}`}>Sign in</Link>
        </Button>
      </Card>
    );
  }

  // Payment state comes from the database (set only by a verified webhook), never from the URL.
  const supabase = await createClient();
  const [{ data: order }, settings] = await Promise.all([
    supabase.from("orders").select("id, order_number, total, currency, email, status, payment_method, payment_status").eq("id", orderId).maybeSingle(),
    getStoreSettings(),
  ]);
  if (!order) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        We couldn&apos;t find that order. <Link href="/account/orders" className="font-medium text-ink underline">View your orders</Link>
      </Card>
    );
  }

  const awaitingPayment = order.payment_method === "online" && ["pending", "failed"].includes(order.payment_status) && order.status === "pending";
  const cancelled = order.status === "cancelled";
  const Icon = cancelled ? XCircle : awaitingPayment ? Clock : CheckCircle2;

  return (
    <Card className="space-y-6 p-8 text-center md:p-12">
      <Icon className={`mx-auto size-12 ${cancelled ? "text-danger" : awaitingPayment ? "text-warning" : "text-success"}`} aria-hidden />
      <div className="space-y-2">
        <h1 className="display text-[clamp(2.25rem,6vw,4rem)]">
          {cancelled ? "Order cancelled" : awaitingPayment ? "Confirming payment" : "Thank you!"}
        </h1>
        <p className="text-sm text-muted">
          Order <strong className="text-ink">{order.order_number}</strong> · {formatMoney(order.total, order.currency, settings.locale)}
        </p>
      </div>
      <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-soft">
        {cancelled
          ? "This order was cancelled because the payment was not completed. Nothing was charged."
          : awaitingPayment
            ? "We're waiting for the payment provider to confirm your payment. This usually takes a few seconds — refresh this page or check your order later."
            : order.payment_method === "cod"
              ? `We've received your order and sent a confirmation to ${order.email}. Please keep the exact amount ready for the courier.`
              : `Your payment was confirmed and a receipt was sent to ${order.email}.`}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {awaitingPayment ? (
          <Button asChild variant="outline">
            <Link href={`/checkout/success?order=${order.id}`}>Refresh status</Link>
          </Button>
        ) : null}
        <Button asChild variant="dark">
          <Link href={`/account/orders/${order.id}`}>View order</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </Card>
  );
}
