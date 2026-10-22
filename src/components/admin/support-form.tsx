"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { useActionRunner } from "@/components/admin/confirm-button";
import { updateSupportMessageAction } from "@/actions/admin/support";

export function SupportForm({ id, status, staffNote }: { id: string; status: string; staffNote: string }) {
  const [s, setS] = React.useState(status);
  const [note, setNote] = React.useState(staffNote);
  const { pending, run } = useActionRunner();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateSupportMessageAction({ id, status: s, staffNote: note }));
      }}
    >
      <Field label="Status" htmlFor="support-status">
        <NativeSelect id="support-status" value={s} onChange={(e) => setS(e.target.value)}>
          <option value="new">New</option>
          <option value="open">Open (in progress)</option>
          <option value="resolved">Resolved</option>
        </NativeSelect>
      </Field>
      <Field label="Staff note" htmlFor="support-note" hint="Internal only.">
        <Textarea id="support-note" className="min-h-24" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div>
        <Button type="submit" loading={pending}>Save</Button>
      </div>
    </form>
  );
}
