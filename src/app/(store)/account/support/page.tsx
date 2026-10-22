import { Suspense } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Support" };

const STATUS = { new: { label: "Received", tone: "warning" }, open: { label: "In progress", tone: "info" }, resolved: { label: "Resolved", tone: "success" } } as const;

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 rounded-lg" aria-busy />}>
      <Messages />
    </Suspense>
  );
}

async function Messages() {
  await requireUser("/account/support");
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("support_messages").select("id, subject, message, status, created_at").order("created_at", { ascending: false }).limit(50),
    getStoreSettings(),
  ]);
  const messages = (data ?? []) as { id: string; subject: string; message: string; status: keyof typeof STATUS; created_at: string }[];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm" variant="dark">
          <Link href="/contact">New message</Link>
        </Button>
      </div>
      {messages.length === 0 ? (
        <Card>
          <EmptyState icon={<LifeBuoy />} title="No support requests" description="Questions about an order? Send us a message and we'll reply by email." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line-soft">
            {messages.map((m) => (
              <li key={m.id} className="space-y-1 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{m.subject}</p>
                  <Badge tone={STATUS[m.status]?.tone ?? "neutral"}>{STATUS[m.status]?.label ?? m.status}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-ink-soft">{m.message}</p>
                <p className="text-xs text-muted">{formatDateTime(m.created_at, settings.timezone)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
