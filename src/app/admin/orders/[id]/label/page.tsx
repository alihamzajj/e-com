import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { FormSkeleton } from "@/components/admin/common";
import { PrintButton } from "@/components/admin/print-button";
import { ShippingLabel } from "@/components/admin/shipping-label";
import { Card, PageHeading } from "@/components/ui/primitives";
import type { Order, OrderItem } from "@/types/domain";

export const metadata = { title: "Shipping label" };

// Prints only the label, edge to edge on a 4 × 6 inch page.
const PRINT_CSS = `
@media print {
  @page { size: 4in 6in; margin: 0; }
  html, body { background: #fff !important; height: 6in; overflow: hidden; }
  body * { visibility: hidden !important; }
  .shipping-label, .shipping-label * { visibility: visible !important; }
  .shipping-label { position: fixed; top: 0; left: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

async function Label({ params }: { params: PageProps<"/admin/orders/[id]/label">["params"] }) {
  await requirePermission("orders");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const [settings, { data: order }, { data: items }] = await Promise.all([
    getStoreSettings(),
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
  ]);
  if (!order) notFound();
  const o = order as Order;

  return (
    <div className="space-y-5">
      <style>{PRINT_CSS}</style>
      <Link href={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Order {o.order_number}
      </Link>
      <PageHeading
        title="Shipping label"
        description="Print it and stick it on the box. Sized for 4 × 6 inch labels; on A4 paper choose “Actual size” in the print window."
        actions={<PrintButton />}
      />
      {!settings.contactPhone || !settings.contactAddress ? (
        <p className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
          Add your shop phone and address in <Link href="/admin/settings" className="font-semibold underline">Settings</Link> so they appear in the “From” box.
        </p>
      ) : null}
      <Card className="label-stage flex justify-center overflow-x-auto bg-surface p-6">
        <div className="shadow-[var(--shadow-pop)]">
          <ShippingLabel order={o} items={(items ?? []) as OrderItem[]} settings={settings} />
        </div>
      </Card>
    </div>
  );
}

export default function LabelPage(props: PageProps<"/admin/orders/[id]/label">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Label params={props.params} />
    </Suspense>
  );
}
