import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ShoppingBag } from "lucide-react";
import { getProfile, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCartQuote } from "@/features/cart/server";
import { getStoreSettings } from "@/features/settings/queries";
import { getPaymentProvider } from "@/lib/payments";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import type { Address } from "@/types/domain";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page pt-8 md:pt-12">
      <h1 className="display mb-10 text-[clamp(2.75rem,7vw,5.5rem)]">Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}

async function CheckoutContent() {
  const user = await requireUser("/checkout");
  await connection();
  const supabase = await createClient();
  const [profile, settings, { quote }, { data: addresses }] = await Promise.all([
    getProfile(),
    getStoreSettings(),
    getCartQuote(),
    supabase
      .from("addresses")
      .select("id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (quote.lines.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ShoppingBag />}
          title="Your cart is empty"
          description="Add something to your cart before checking out."
          action={
            <Button asChild>
              <Link href="/products">Browse products</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const provider = getPaymentProvider();
  return (
    <CheckoutForm
      // Issued per page render; retries of the same submission reuse it.
      idempotencyKey={crypto.randomUUID()}
      quote={quote}
      addresses={(addresses ?? []) as Address[]}
      contact={{ name: profile?.full_name ?? "", email: profile?.email ?? user.email ?? "", phone: profile?.phone ?? "" }}
      codEnabled={settings.codEnabled}
      onlineEnabled={settings.onlinePaymentsEnabled && provider !== null}
      onlineLabel={provider?.label ?? "Pay online"}
      locale={settings.locale}
    />
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]" aria-busy aria-label="Loading checkout">
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-48 rounded-lg" />
        ))}
      </div>
      <div className="skeleton h-96 rounded-lg" />
    </div>
  );
}
