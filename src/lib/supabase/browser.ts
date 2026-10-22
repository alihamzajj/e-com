import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/config/public";

export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseKey);
}
