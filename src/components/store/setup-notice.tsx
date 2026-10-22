import { isSupabaseConfigured } from "@/lib/config/public";

/** Shown only when the database is not connected yet (fresh clone / missing env). */
export function SetupNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <div role="status" className="bg-warning-soft px-4 py-2 text-center text-xs text-warning">
      The store database is not connected. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — see README.
    </div>
  );
}
