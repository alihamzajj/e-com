import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/session";
import { getStoreSettings } from "@/features/settings/queries";
import { resolveRange } from "@/features/admin/date-range";
import { searchParam } from "@/features/admin/guard";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { ReportSkeleton, ReportView } from "@/components/admin/report-view";
import { PageHeading } from "@/components/ui/primitives";

export const metadata = { title: "Reports" };

async function Reports({ searchParams }: { searchParams: PageProps<"/admin/reports">["searchParams"] }) {
  await requirePermission("reports");
  const sp = await searchParams;
  const settings = await getStoreSettings();
  const range = resolveRange(
    { range: searchParam(sp, "range"), from: searchParam(sp, "from"), to: searchParam(sp, "to") },
    settings.timezone,
  );
  return (
    <div className="space-y-6">
      <PageHeading title="Reports" description={`Sales, orders and customers · ${range.label}`} />
      <DateRangeFilter basePath="/admin/reports" preset={range.preset} fromDate={range.fromDate} toDate={range.toDate} timezone={settings.timezone} />
      <Suspense key={`${range.from.toISOString()}-${range.to.toISOString()}`} fallback={<ReportSkeleton />}>
        <ReportView range={range} settings={settings} mode="full" />
      </Suspense>
    </div>
  );
}

export default function ReportsPage(props: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <Reports searchParams={props.searchParams} />
    </Suspense>
  );
}
