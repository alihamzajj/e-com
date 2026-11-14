"use server";

import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { createStaffSchema, roleSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";

/** 12 characters without look-alikes (0/O, 1/l/I), easy to read out or send by message. */
function temporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join("");
}

/**
 * Creates a team member's login from the admin, so they need not sign up on
 * the storefront: the account is confirmed straight away with a temporary
 * password (shown once to the administrator), then given its role.
 */
export async function createStaffAccountAction(input: unknown): Promise<ActionResult<{ email: string; password: string }>> {
  const admin = await actionProfile("admin");
  if (!admin) return FORBIDDEN;
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Creating accounts needs SUPABASE_SECRET_KEY in Vercel. Add it, redeploy, and try again." };
  }
  const { fullName, email, role, permissions } = parsed.data;
  const password = temporaryPassword();

  const { data, error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    if (error?.code === "email_exists" || /already/i.test(error?.message ?? "")) {
      return { ok: false, error: "That email already has an account. Search for it under “Give an existing account access”." };
    }
    return fail(error ?? new Error("No user returned"), "admin.staff.create");
  }

  // The role change runs as the signed-in administrator, so it is checked and audited like any other.
  const supabase = await createClient();
  const { error: roleError } = await supabase.rpc("admin_set_user_role", {
    p_user_id: data.user.id,
    p_role: role,
    p_permissions: role === "staff" ? permissions : [],
  });
  if (roleError) return fail(roleError, "admin.staff.create.role");
  return { ok: true, data: { email, password }, message: `Account created for ${fullName}.` };
}

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
