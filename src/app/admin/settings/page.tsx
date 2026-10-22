import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { mapSettings } from "@/features/settings/queries";
import { getPaymentProvider } from "@/lib/payments";
import { SettingsForm } from "@/components/admin/settings-form";
import { FormSkeleton } from "@/components/admin/common";
import { Card, PageHeading } from "@/components/ui/primitives";

export const metadata = { title: "Settings" };

async function Settings() {
  await requirePermission("settings");
  // Read fresh (not the cached public copy) so the form never edits stale values.
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return <Card role="alert" className="p-6 text-sm text-danger">Settings could not be loaded.</Card>;
  const s = mapSettings(data);
  const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeading title="Settings" description="Store details, shipping, payments and home page content." />
      <SettingsForm
        gatewayConfigured={getPaymentProvider() !== null}
        initial={{
          storeName: s.storeName,
          tagline: s.tagline,
          logoUrl: s.logoUrl ?? "",
          currency: s.currency,
          locale: s.locale,
          timezone: s.timezone,
          contactEmail: s.contactEmail ?? "",
          contactPhone: s.contactPhone ?? "",
          contactAddress: s.contactAddress ?? "",
          shippingMethods: s.shippingMethods.map((m) => ({ id: m.id, label: m.label, price: m.price, eta: m.eta ?? "" })),
          freeShippingThreshold: str(s.freeShippingThreshold),
          codEnabled: s.codEnabled,
          onlinePaymentsEnabled: s.onlinePaymentsEnabled,
          newsletterEnabled: s.newsletterEnabled,
          lowStockAlertEmail: s.lowStockAlertEmail ?? "",
          hero: { title: "", subtitle: "", cta_label: "", cta_href: "", image_url: "", ...s.hero },
          promo: { eyebrow: "", title: "", body: "", cta_label: "", cta_href: "", image_url: "", ...s.promo },
          policies: { shipping: "", returns: "", privacy: "", terms: "", ...s.policies },
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Settings />
    </Suspense>
  );
}
