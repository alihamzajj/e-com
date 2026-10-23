"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, NativeSelect } from "@/components/ui/form-controls";
import { useActionRunner } from "@/components/admin/confirm-button";
import { setUserRoleAction } from "@/actions/admin/staff";
import { PERMISSIONS, type Permission, type Role } from "@/types/domain";

const LABELS: Record<Permission, string> = {
  products: "Products & inventory",
  orders: "Orders & payments",
  customers: "Customers",
  support: "Q&A & support",
  coupons: "Coupons",
  reports: "Reports",
  settings: "Settings",
};

export function RoleEditor({
  userId,
  role,
  permissions,
  isSelf,
}: {
  userId: string;
  role: Role;
  permissions: Permission[];
  isSelf: boolean;
}) {
  const [r, setR] = React.useState<Role>(role);
  const [perms, setPerms] = React.useState<Set<Permission>>(new Set(permissions));
  const { pending, run } = useActionRunner();
  const changed = r !== role || (r === "staff" && [...perms].sort().join() !== [...permissions].sort().join());

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`role-${userId}`}>Role</label>
        <NativeSelect id={`role-${userId}`} className="h-9 w-40" value={r} disabled={isSelf} onChange={(e) => setR(e.target.value as Role)}>
          <option value="customer">Customer (no access)</option>
          <option value="staff">Staff</option>
          <option value="admin">Administrator</option>
        </NativeSelect>
        <Button
          size="sm"
          disabled={!changed || pending || isSelf}
          loading={pending}
          onClick={() => run(() => setUserRoleAction({ userId, role: r, permissions: r === "staff" ? [...perms] : [] }))}
        >
          Save
        </Button>
        {isSelf ? <span className="text-xs text-muted">This is you</span> : null}
      </div>
      {r === "staff" ? (
        <fieldset className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <legend className="mb-1 text-xs text-muted">Permissions</legend>
          {PERMISSIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={perms.has(p)}
                onChange={(e) => {
                  const next = new Set(perms);
                  if (e.target.checked) next.add(p);
                  else next.delete(p);
                  setPerms(next);
                }}
              />
              {LABELS[p]}
            </label>
          ))}
        </fieldset>
      ) : r === "admin" ? (
        <p className="text-xs text-muted">Administrators have every permission and can manage staff.</p>
      ) : null}
    </div>
  );
}
