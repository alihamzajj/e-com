"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";

const schema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "open", "resolved"]),
  staffNote: z.string().trim().max(2000).optional(),
});

export async function updateSupportMessageAction(input: unknown): Promise<ActionResult> {
  if (!(await actionProfile("support"))) return FORBIDDEN;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("support_messages")
    .update({ status: parsed.data.status, staff_note: parsed.data.staffNote || null })
    .eq("id", parsed.data.id);
  if (error) return fail(error, "admin.support.update");
  return { ok: true, data: undefined, message: "Message updated." };
}
