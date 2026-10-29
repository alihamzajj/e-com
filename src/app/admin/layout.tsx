import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth/session";
import { getStoreSettings } from "@/features/settings/queries";
import { navFor } from "@/features/admin/nav";
import { getAttentionCounts } from "@/features/admin/attention";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

async function AdminChrome({ children }: { children: React.ReactNode }) {
  // Staff only. Customers are redirected; every page and action re-checks its
  // own permission, and RLS enforces it again in the database.
  const profile = await requireStaff();
  const [settings, counts] = await Promise.all([getStoreSettings(), getAttentionCounts(profile)]);
  const sum = (...n: (number | null)[]) => n.reduce<number>((a, b) => a + (b ?? 0), 0);
  return (
    <AdminShell
      storeName={settings.storeName}
      items={navFor(profile)}
      badges={{
        orders: sum(counts.toConfirm),
        products: sum(counts.lowStock, counts.uncategorised),
        questions: sum(counts.questions, counts.reports),
        support: sum(counts.support),
      }}
      user={{ name: profile.full_name || "Staff member", email: profile.email ?? "", role: profile.role }}
    >
      {children}
    </AdminShell>
  );
}

function ChromeFallback() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <div className="hidden border-r border-line-soft bg-card p-4 lg:block">
        <Skeleton className="mb-6 h-6 w-28" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="mb-2 h-8 w-full" />
        ))}
      </div>
      <div className="p-8">
        <Skeleton className="mb-6 h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ChromeFallback />}>
      <AdminChrome>{children}</AdminChrome>
    </Suspense>
  );
}
