import "server-only";
import { serverEnv, isServiceRoleConfigured } from "@/lib/config/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/errors";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  orderId?: string | null;
};

export type EmailResult = { status: "sent" | "failed" | "skipped"; providerId?: string; error?: string };

export function isEmailConfigured() {
  return Boolean(serverEnv.resendApiKey && serverEnv.emailFrom);
}

/**
 * Sends through Resend's HTTP API and records the outcome in email_logs. A
 * message only counts as "sent" when the provider accepted it and returned an id.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const log = isServiceRoleConfigured() ? createAdminClient() : null;
  let logId: string | null = null;
  if (log) {
    const { data } = await log
      .from("email_logs")
      .insert({ to_email: message.to, template: message.template, subject: message.subject, order_id: message.orderId ?? null })
      .select("id")
      .single();
    logId = (data as { id: string } | null)?.id ?? null;
  }

  const finish = async (result: EmailResult) => {
    if (log && logId) {
      await log
        .from("email_logs")
        .update({ status: result.status, provider_message_id: result.providerId ?? null, error: result.error?.slice(0, 500) ?? null })
        .eq("id", logId);
    }
    return result;
  };

  if (!isEmailConfigured()) {
    return finish({ status: "skipped", error: "Email provider not configured" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: serverEnv.emailFrom,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(serverEnv.emailReplyTo ? { reply_to: serverEnv.emailReplyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) {
      return finish({ status: "failed", error: body.message ?? `HTTP ${res.status}` });
    }
    return finish({ status: "sent", providerId: body.id });
  } catch (error) {
    logServerError("email", error);
    return finish({ status: "failed", error: (error as Error).message });
  }
}
