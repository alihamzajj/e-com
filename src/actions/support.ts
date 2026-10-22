"use server";

import { supportSchema } from "@/lib/validation/schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { fail, type ActionResult } from "@/lib/errors";

type Input = { name: string; email: string; subject: string; message: string; orderNumber?: string; website?: string };

export async function submitSupportAction(input: Input): Promise<ActionResult> {
  const parsed = supportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const SUCCESS = "Thanks — we received your message and will reply by email.";
  if (parsed.data.website) return { ok: true, data: undefined, message: SUCCESS };
  if (!isServiceRoleConfigured()) return { ok: false, error: "The contact form is not available right now. Please email us instead." };

  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`support:ip:${ip}`, 5, 3600),
    rateLimit(`support:email:${parsed.data.email}`, 5, 3600),
  ]);
  if (!byIp || !byEmail) return { ok: false, error: "Too many messages. Please try again later." };

  const user = await getSessionUser();
  let orderId: string | null = null;
  if (user && parsed.data.orderNumber) {
    // Only link an order the signed-in customer can see (RLS: their own).
    const supabase = await createClient();
    const { data } = await supabase.from("orders").select("id").eq("order_number", parsed.data.orderNumber.toUpperCase()).maybeSingle();
    orderId = (data as { id: string } | null)?.id ?? null;
  }

  const subject = parsed.data.orderNumber && !orderId ? `${parsed.data.subject} (order ${parsed.data.orderNumber})` : parsed.data.subject;
  const { error } = await createAdminClient()
    .from("support_messages")
    .insert({
      user_id: user?.id ?? null,
      order_id: orderId,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: subject.slice(0, 160),
      message: parsed.data.message,
    });
  if (error) return fail(error, "support.submit");
  return { ok: true, data: undefined, message: SUCCESS };
}
