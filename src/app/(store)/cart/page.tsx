import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ShoppingBag } from "lucide-react";
import { getCartQuote } from "@/features/cart/server";
import { getStoreSettings } from "@/features/settings/queries";
import { CartLine } from "@/components/cart/cart-line";
import { CouponForm } from "@/components/cart/coupon-form";
import { SummaryRows } from "@/components/cart/order-summary";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { userMessage } from "@/lib/errors";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page pt-8 md:pt-12">
      <h1 className="display mb-10 text-[clamp(2.75rem,7vw,5.5rem)]">Your cart</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </div>
  );
}

async function CartContents() {
  const settings = await getStoreSettings();
  let result;
  try {
    result = await getCartQuote();
  } catch {
    return (
      <Card>
        <EmptyState icon={<AlertTriangle />} title="We couldn't load your cart" description="Please refresh the page in a moment." />
      </Card>
    );
  }
  const { quote } = result;
  if (quote.lines.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ShoppingBag />}
          title="Your cart is empty"
          description="Browse the catalog and add something you like."
          action={
            <Button asChild>
              <Link href="/products">Start shopping</Link>
            </Button>
          }
        />
      </Card>
    );
  }
  const currency = quote.currency || settings.currency;
  const remaining =
    quote.free_shipping_threshold != null ? Math.max(0, quote.free_shipping_threshold - (quote.subtotal - quote.discount_total)) : null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="px-5">
        {quote.issue_count > 0 ? (
          <p role="alert" className="mt-5 flex items-center gap-2 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
            <AlertTriangle className="size-4" aria-hidden /> Some items need your attention before checkout.
          </p>
        ) : null}
        <ul className="divide-y divide-line-soft">
          {quote.lines.map((line) => (
            <CartLine key={`${line.variant_id}-${line.quantity}`} line={line} currency={currency} locale={settings.locale} />
          ))}
        </ul>
      </Card>
      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <Card className="space-y-5 p-5">
          <h2 className="font-semibold">Summary</h2>
          <CouponForm
            applied={quote.coupon ? { code: quote.coupon.code, valid: quote.coupon.valid, error: quote.coupon.error } : null}
            invalidMessage={quote.coupon && !quote.coupon.valid ? userMessage({ message: quote.coupon.error ?? "COUPON_INVALID" }) : null}
          />
          <SummaryRows
            subtotal={quote.subtotal}
            discount={quote.discount_total}
            shipping={quote.shipping_total}
            shippingLabel={quote.shipping_method?.label}
            total={quote.total}
            currency={currency}
            locale={settings.locale}
            couponCode={quote.coupon?.valid ? quote.coupon.code : null}
            freeShippingRemaining={remaining}
          />
          <p className="text-xs text-muted">Shipping shown is an estimate for the default method. You can choose a method at checkout.</p>
          {quote.issue_count > 0 ? (
            <Button size="lg" className="w-full" disabled>
              Resolve cart issues to continue
            </Button>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href="/checkout">
                Checkout <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </Card>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy aria-label="Loading cart">
      <div className="space-y-4 rounded-lg bg-card p-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="skeleton size-24 rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-4 w-1/4 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton h-72 rounded-lg" />
    </div>
  );
}
