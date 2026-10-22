import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/public";

/**
 * Cookie-less anonymous client for public catalog reads inside `use cache`
 * scopes. It can only see what RLS exposes to `anon`, so cached results never
 * contain private data.
 */
export function createPublicClient() {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
