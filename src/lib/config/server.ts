import "server-only";

// Secrets. Never import this file from a Client Component; "server-only" makes
// that a build error.
export const serverEnv = {
  supabaseServiceKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "").toLowerCase(),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
} as const;

export function isServiceRoleConfigured() {
  return Boolean(serverEnv.supabaseServiceKey);
}
