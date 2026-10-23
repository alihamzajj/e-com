import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requirePermission, profileHasPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { FormSkeleton, SectionCard } from "@/components/admin/common";
import { SupportForm } from "@/components/admin/support-form";
import { Badge, PageHeading } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Support message" };

type Message = {
  id: string; name: string; email: string; subject: string; message: string; status: string; staff_note: string | null;
  created_at: string; updated_at: string; user_id: string | null; order_id: string | null;
};

async function SupportDetail({ params }: { params: PageProps<"/admin/support/[id]">["params"] }) {
  const staff = await requirePermission("support");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const settings = await getStoreSettings();
  const supabase = await createClient();
  const { data } = await supabase.from("support_messages").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const m = data as Message;
  let orderNumber: string | null = null;
  if (m.order_id && profileHasPermission(staff, "orders")) {
    const { data: o } = await supabase.from("orders").select("order_number").eq("id", m.order_id).maybeSingle();
    orderNumber = (o as { order_number: string } | null)?.order_number ?? null;
  }

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/admin/support" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Support
      </Link>
      <PageHeading title={m.subject} description={`Received ${formatDateTime(m.created_at, settings.timezone, settings.locale)}`} actions={<Badge className="capitalize">{m.status}</Badge>} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <SectionCard title="Message">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
          <a
            href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
            className="mt-5 inline-flex h-9 items-center rounded-sm bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft"
          >
            Reply by email
          </a>
        </SectionCard>
        <div className="grid content-start gap-5">
          <SectionCard title="From">
            <dl className="grid gap-2 text-sm">
              <div><dt className="text-xs text-muted">Name</dt><dd>{m.name}</dd></div>
              <div><dt className="text-xs text-muted">Email</dt><dd className="break-all">{m.email}</dd></div>
              {m.user_id && profileHasPermission(staff, "customers") ? (
                <div><Link href={`/admin/customers/${m.user_id}`} className="text-xs text-muted hover:text-ink">View customer →</Link></div>
              ) : null}
              {m.order_id ? (
                <div>
                  <dt className="text-xs text-muted">Order</dt>
                  <dd>{orderNumber ? <Link href={`/admin/orders/${m.order_id}`} className="hover:underline">{orderNumber}</Link> : "Linked order"}</dd>
                </div>
              ) : null}
            </dl>
          </SectionCard>
          <SectionCard title="Handling">
            <SupportForm id={m.id} status={m.status} staffNote={m.staff_note ?? ""} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default function SupportMessagePage(props: PageProps<"/admin/support/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SupportDetail params={props.params} />
    </Suspense>
  );
}
