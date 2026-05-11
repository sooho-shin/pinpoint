"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/nickname`
    }
  });

  if (error || !data.url) {
    redirect("/signin?error=oauth");
  }

  redirect(data.url);
}
