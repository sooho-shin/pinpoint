import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/env";

export function createAdminClient() {
  const { url, serviceRoleKey } = getServerSupabaseEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
