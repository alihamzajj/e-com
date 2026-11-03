"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";
import { SETTINGS_TAG } from "@/features/settings/queries";
import { ORBIT_MAX } from "@/features/catalog/home-orbit";

const idsSchema = z.array(z.uuid()).max(ORBIT_MAX, `Pick up to ${ORBIT_MAX} products.`);

/** Saves which products ride the home page orbit, in order. Leaves the rest of the hero untouched. */
export async function saveOrbitProductsAction(input: unknown): Promise<ActionResult> {
  if (!(await actionProfile("settings"))) return FORBIDDEN;
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Those products could not be saved." };
  const ids = [...new Set(parsed.data)];

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase.from("store_settings").select("hero").eq("id", 1).maybeSingle();
  if (readError) return fail(readError, "admin.homepage.read");
  const hero = { ...((current?.hero as Record<string, unknown> | null) ?? {}), product_ids: ids };

  const { error } = await supabase.from("store_settings").update({ hero }).eq("id", 1);
  if (error) return fail(error, "admin.homepage.save");
  updateTag(SETTINGS_TAG);
  return { ok: true, data: undefined, message: ids.length ? "Homepage updated." : "Orbit cleared — the homepage shows your best sellers." };
}
