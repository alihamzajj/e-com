"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { createStaffAccountAction } from "@/actions/admin/staff";
import { PERMISSION_LABELS } from "@/components/admin/role-editor";
import { PERMISSIONS, type Permission } from "@/types/domain";

type Created = { name: string; email: string; password: string };

/**
 * Admin → Staff: create a team member's login directly. The temporary password
 * is shown once, to copy and send to them; it is never stored or shown again.
 */
export function CreateStaffForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"staff" | "admin">("staff");
  const [perms, setPerms] = React.useState<Set<Permission>>(new Set(["orders"]));
  const [created, setCreated] = React.useState<Created | null>(null);
  const [copied, setCopied] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await createStaffAccountAction({ fullName: name, email, role, permissions: [...perms] });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(r.message ?? "Account created.");
      setCreated({ name, email: r.data.email, password: r.data.password });
      setName("");
      setEmail("");
      router.refresh();
    });
  };

  const details = created
    ? `Ghani Traders admin\nSign in: ${typeof window === "undefined" ? "" : window.location.origin}/login\nEmail: ${created.email}\nPassword: ${created.password}`
    : "";

  return (
    <div className="grid gap-4">
      {!enabled ? (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
          Not available yet: creating accounts needs <code className="font-mono">SUPABASE_SECRET_KEY</code> in Vercel → Settings →
          Environment Variables. Until then, the person can sign up on the store and you give them access below.
        </p>
      ) : null}

      {created ? (
        <div className="grid gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm">
          <p className="font-semibold text-success">Account created for {created.name}.</p>
          <p className="text-ink-soft">
            Send them these sign-in details. The password is shown only now; they can change it later under Account → Password.
          </p>
          <pre className="overflow-x-auto rounded-sm bg-card px-3 py-2 font-mono text-xs text-ink">{details}</pre>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(details);
                setCopied(true);
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy details"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setCreated(null); setCopied(false); }}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="staff-name" required>
            <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!enabled} autoComplete="off" />
          </Field>
          <Field label="Email" htmlFor="staff-email" required hint="They sign in with this.">
            <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!enabled} autoComplete="off" />
          </Field>
          <Field label="Role" htmlFor="staff-role">
            <NativeSelect id="staff-role" value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} disabled={!enabled}>
              <option value="staff">Staff (chosen sections)</option>
              <option value="admin">Administrator (everything)</option>
            </NativeSelect>
          </Field>
        </div>
        {role === "staff" ? (
          <fieldset className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" disabled={!enabled}>
            <legend className="mb-1 text-xs text-muted">What they can open</legend>
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
                {PERMISSION_LABELS[p]}
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="text-xs text-muted">Administrators have every permission, including adding and removing staff.</p>
        )}
        <div>
          <Button type="submit" loading={pending} disabled={!enabled || !name.trim() || !email.trim()}>
            <UserPlus /> Create account
          </Button>
        </div>
      </form>
    </div>
  );
}
