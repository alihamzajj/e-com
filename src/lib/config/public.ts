// Values safe to ship to the browser. NEXT_PUBLIC_* must be referenced literally
// so Next.js can inline them at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function normaliseSiteUrl(value: string | undefined) {
  const fallback = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";
  try {
    return new URL(value || fallback).origin;
  } catch {
    return fallback;
  }
}

export const publicEnv = {
  supabaseUrl,
  supabaseKey,
  siteUrl: normaliseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
} as const;

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey);
}
