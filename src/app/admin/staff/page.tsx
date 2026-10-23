import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { safeSearch, searchParam } from "@/features/admin/guard";
import { FilterBar, FilterField, filterInput, SectionCard, TableSkeleton } from "@/components/admin/common";
import { RoleEditor } from "@/components/admin/role-editor";
import { Badge, PageHeading } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils/format";
import type { Permission, Role } from "@/types/domain";

export const metadata = { title: "Staff" };

type P = { id: string; email: string | null; full_name: string | null; role: Role; permissions: Permission[] };
type Audit = { id: number; actor_id: string | null; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: string };

function PersonRow({ p, selfId }: { p: P; selfId: string }) {
  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="min-w-0">
        <p className="font-medium">{p.full_name || "—"} {p.role !== "customer" ? <Badge tone="dark" className="ml-1 capitalize">{p.role}</Badge> : null}</p>
        <p className="truncate text-xs text-muted">{p.email}</p>
      </div>
      <RoleEditor userId={p.id} role={p.role} permissions={p.permissions} isSelf={p.id === selfId} />
    </li>
  );
}

async function Staff({ searchParams }: { searchParams: PageProps<"/admin/staff">["searchParams"] }) {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/admin?denied=staff");
  const sp = await searchParams;
  const q = safeSearch(searchParam(sp, "q"));
  const settings = await getStoreSettings();
  const supabase = await createClient();

  const [{ data: team }, { data: found }, { data: audit }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, permissions").in("role", ["staff", "admin"]).order("role").order("email"),
    q
      ? supabase.from("profiles").select("id, email, full_name, role, permissions").or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(20)
      : Promise.resolve({ data: [] }),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(40),
  ]);
  const teamRows = (team ?? []) as P[];
  const names = new Map(teamRows.map((t) => [t.id, t.full_name || t.email || "Staff"]));

  return (
    <div className="space-y-5">
      <PageHeading title="Staff & access" description="Grant staff only the permissions they need. Accounts are created by signing up on the storefront." />
      <SectionCard title="Team" bodyClassName="p-0">
        <ul className="divide-y divide-line-soft">
          {teamRows.map((p) => <PersonRow key={p.id} p={p} selfId={profile.id} />)}
        </ul>
      </SectionCard>
      <SectionCard title="Add a team member" description="Find an existing account by email or name, then assign a role.">
        <FilterBar action="/admin/staff">
          <FilterField label="Search accounts" className="min-w-60 flex-1">
            <input name="q" defaultValue={q} placeholder="email@example.com" className={filterInput} />
          </FilterField>
        </FilterBar>
        {q ? (
          (found ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted">No accounts match “{q}”. They need to sign up first.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line-soft rounded-md border border-line-soft">
              {((found ?? []) as P[]).map((p) => <PersonRow key={p.id} p={p} selfId={profile.id} />)}
            </ul>
          )
        ) : null}
      </SectionCard>
      <SectionCard title="Audit log" description="Recent sensitive changes (latest 40)." bodyClassName="p-0">
        {(audit ?? []).length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No audit entries yet.</p>
        ) : (
          <Table>
            <THead><tr><TH>When</TH><TH>Who</TH><TH>Action</TH><TH>Record</TH><TH>Details</TH></tr></THead>
            <tbody>
              {((audit ?? []) as Audit[]).map((a) => (
                <TR key={a.id}>
                  <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(a.created_at, settings.timezone, settings.locale)}</TD>
                  <TD className="text-xs">{a.actor_id ? names.get(a.actor_id) ?? a.actor_id.slice(0, 8) : "System"}</TD>
                  <TD className="text-xs">{a.action.replace(/_/g, " ")}</TD>
                  <TD className="text-xs">{a.entity}{a.entity_id ? <span className="block font-mono text-muted">{a.entity_id.slice(0, 8)}</span> : null}</TD>
                  <TD className="max-w-md truncate font-mono text-[11px] text-muted" title={JSON.stringify(a.details)}>
                    {Object.keys(a.details ?? {}).slice(0, 6).join(", ")}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

export default function StaffPage(props: PageProps<"/admin/staff">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Staff searchParams={props.searchParams} />
    </Suspense>
  );
}
