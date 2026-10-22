"use server";

import { createClient } from "@/lib/supabase/server";
import { roleSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";

export async function setUserRoleAction(input: unknown): Promise<ActionResult> {
  const admin = await actionProfile("admin");
  if (!admin) return FORBIDDEN;
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid role." };
  const { userId, role, permissions } = parsed.data;
  if (userId === admin.id && role !== "admin") {
    return { ok: false, error: "You cannot remove your own administrator role." };
  }
  if (role === "staff" && permissions.length === 0) {
    return { ok: false, error: "Give staff members at least one permission." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: role, p_permissions: permissions });
  if (error) return fail(error, "admin.staff.role");
  return { ok: true, data: undefined, message: role === "customer" ? "Access removed." : "Access updated." };
}
