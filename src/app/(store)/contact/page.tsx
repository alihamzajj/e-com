import type { Metadata } from "next";
import { Suspense } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { getStoreSettings } from "@/features/settings/queries";
import { getProfile, getSessionUser } from "@/lib/auth/session";
import { ContactForm } from "@/components/store/contact-form";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Contact us", description: "Questions about an order or a product? Send us a message." };

export default async function ContactPage(props: PageProps<"/contact">) {
  const settings = await getStoreSettings();
  return (
    <div className="container-page pt-8 md:pt-12">
      <h1 className="display mb-3 text-[clamp(2.75rem,7vw,5.5rem)]">Contact us</h1>
      <p className="mb-10 max-w-lg text-sm text-muted">Questions about an order or a product? We usually reply within one business day.</p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 md:p-8">
          <Suspense fallback={<div className="skeleton h-96 rounded" aria-busy />}>
            <PrefilledForm searchParams={props.searchParams} />
          </Suspense>
        </Card>
        <aside className="space-y-3 text-sm">
          {settings.contactEmail ? (
            <Card className="flex items-center gap-3 p-4">
              <Mail className="size-4 text-accent" aria-hidden />
              <a href={`mailto:${settings.contactEmail}`} className="inline-flex min-h-10 items-center hover:underline">
                {settings.contactEmail}
              </a>
            </Card>
          ) : null}
          {settings.contactPhone ? (
            <Card className="flex items-center gap-3 p-4">
              <Phone className="size-4 text-accent" aria-hidden />
              <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="inline-flex min-h-10 items-center hover:underline">
                {settings.contactPhone}
              </a>
            </Card>
          ) : null}
          {settings.contactAddress ? (
            <Card className="flex items-center gap-3 p-4">
              <MapPin className="size-4 text-accent" aria-hidden />
              {settings.contactAddress}
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

async function PrefilledForm({ searchParams }: { searchParams: PageProps<"/contact">["searchParams"] }) {
  const [sp, user, profile] = await Promise.all([searchParams, getSessionUser(), getProfile()]);
  const order = typeof sp.order === "string" ? sp.order.slice(0, 40) : "";
  return (
    <ContactForm
      defaults={{
        name: profile?.full_name ?? "",
        email: profile?.email ?? user?.email ?? "",
        orderNumber: order,
        subject: order ? `Question about order ${order}` : "",
      }}
    />
  );
}
