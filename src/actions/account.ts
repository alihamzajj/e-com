"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { addressSchema, profileSchema, type AddressInput } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { fail, type ActionResult } from "@/lib/errors";

async function authed() {
  const user = await getSessionUser();
  if (!user) return null;
  return { user, supabase: await createClient() };
}

const SIGNED_OUT: ActionResult<never> = { ok: false, error: "Your session expired. Please sign in again." };

export async function updateProfileAction(input: { fullName: string; phone?: string; marketingOptIn?: boolean }): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx) return SIGNED_OUT;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  // Column privileges only allow these three fields; RLS restricts to the own row.
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null, marketing_opt_in: parsed.data.marketingOptIn ?? false })
    .eq("id", ctx.user.id);
  if (error) return fail(error, "account.profile");
  refresh();
  return { ok: true, data: undefined, message: "Profile saved." };
}

function toRow(a: AddressInput) {
  return {
    label: a.label ?? null,
    full_name: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? null,
    city: a.city,
    state: a.state ?? null,
    postal_code: a.postalCode ?? null,
    country: a.country,
  };
}

export async function saveAddressAction(input: AddressInput & { id?: string }): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx) return SIGNED_OUT;
  const parsed = addressSchema.safeParse(input);
  const id = input.id && z.uuid().safeParse(input.id).success ? input.id : undefined;
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };

  const { count } = await ctx.supabase.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id);
  const makeDefault = parsed.data.isDefault || (count ?? 0) === 0;
  if (makeDefault) {
    // Only one default per user (unique partial index) — clear the old one first.
    await ctx.supabase.from("addresses").update({ is_default: false }).eq("user_id", ctx.user.id).eq("is_default", true);
  }
  const row = { ...toRow(parsed.data), ...(makeDefault ? { is_default: true } : {}) };
  const { error } = id
    ? await ctx.supabase.from("addresses").update(row).eq("id", id).eq("user_id", ctx.user.id)
    : await ctx.supabase.from("addresses").insert({ ...row, user_id: ctx.user.id });
  if (error) return fail(error, "account.address_save");
  refresh();
  return { ok: true, data: undefined, message: "Address saved." };
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx) return SIGNED_OUT;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Address not found." };
  const { error } = await ctx.supabase.from("addresses").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return fail(error, "account.address_delete");
  refresh();
  return { ok: true, data: undefined, message: "Address removed." };
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx) return SIGNED_OUT;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Address not found." };
  await ctx.supabase.from("addresses").update({ is_default: false }).eq("user_id", ctx.user.id).eq("is_default", true);
  const { error } = await ctx.supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return fail(error, "account.address_default");
  refresh();
  return { ok: true, data: undefined, message: "Default address updated." };
}
