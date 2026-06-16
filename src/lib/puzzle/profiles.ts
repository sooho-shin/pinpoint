import { createAdminClient } from "@/lib/supabase/admin";

export async function getProfile(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,nickname")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; nickname: string } | null;
}
