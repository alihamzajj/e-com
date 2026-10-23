import { isSupabaseConfigured } from "@/lib/config/public";

/** Shown only when the database is not connected yet (fresh clone / missing env). */
export function SetupNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <div role="status" className="bg-warning-soft px-4 py-2 text-center text-xs text-warning">
      <span className="sm:hidden">Demo mode: sample products only.</span>
      <span className="hidden sm:inline">
        Demo mode: showing sample products. Connect Supabase (see docs/SETUP.md) to enable accounts, checkout and the admin.
      </span>
    </div>
  );
}
