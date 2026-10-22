"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";
import { SETTINGS_TAG } from "@/features/settings/queries";
import { uploadImage } from "@/lib/storage/upload";

const clean = <T extends Record<string, string | undefined>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  if (!(await actionProfile("settings"))) return FORBIDDEN;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please fix the form.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const s = parsed.data;
  if (new Set(s.shippingMethods.map((m) => m.id)).size !== s.shippingMethods.length) {
    return { ok: false, error: "Each shipping method needs a unique id." };
  }
  if (!s.codEnabled && !s.onlinePaymentsEnabled) {
    return { ok: false, error: "Enable at least one payment method, or customers cannot check out." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("store_settings")
    .update({
      store_name: s.storeName,
      tagline: s.tagline,
      logo_url: s.logoUrl ?? null,
      currency: s.currency,
      locale: s.locale,
      timezone: s.timezone,
      contact_email: s.contactEmail || null,
      contact_phone: s.contactPhone || null,
      contact_address: s.contactAddress || null,
      shipping_methods: s.shippingMethods.map((m) => ({ id: m.id, label: m.label, price: m.price, ...(m.eta ? { eta: m.eta } : {}) })),
      free_shipping_threshold: s.freeShippingThreshold ?? null,
      cod_enabled: s.codEnabled,
      online_payments_enabled: s.onlinePaymentsEnabled,
      newsletter_enabled: s.newsletterEnabled,
      low_stock_alert_email: s.lowStockAlertEmail || null,
      hero: clean(s.hero),
      promo: clean(s.promo),
      policies: clean(s.policies),
    })
    .eq("id", 1);
  if (error) return fail(error, "admin.settings.save");
  updateTag(SETTINGS_TAG);
  return { ok: true, data: undefined, message: "Settings saved." };
}

export async function uploadSettingsImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  if (!(await actionProfile("settings"))) return FORBIDDEN;
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose an image." };
  const supabase = await createClient();
  const result = await uploadImage(supabase, file, "store");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: { url: result.url }, message: "Image uploaded — save settings to apply it." };
}
