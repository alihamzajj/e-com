"use server";

import { newsletterSchema } from "@/lib/validation/schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, type ActionResult } from "@/lib/errors";

const SUCCESS = "Thanks — you're on the list.";

export async function subscribeNewsletterAction(input: { email: string; website?: string }): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  // Bots fill the hidden field; pretend success so they learn nothing.
  if (parsed.data.website) return { ok: true, data: undefined, message: SUCCESS };
  if (!isServiceRoleConfigured()) return { ok: false, error: "Newsletter sign-up is not available right now." };

  const ip = await clientIp();
  if (!(await rateLimit(`newsletter:${ip}`, 5, 3600))) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }
  // The unique index is on lower(email); the schema already lower-cases input.
  const { error } = await createAdminClient().from("newsletter_subscribers").insert({ email: parsed.data.email });
  // A unique-violation on lower(email) means already subscribed: same message (no enumeration).
  if (error && error.code !== "23505") return fail(error, "newsletter.subscribe");
  return { ok: true, data: undefined, message: SUCCESS };
}
