"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: FormDataEntryValue | null) {
  const next = String(value ?? "/");
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));

  const supabase = await createSupabaseServerClient();
  const headerStore = await headers();
  const origin = getPublicSiteOrigin(headerStore);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error || !data.url) {
    redirect(`/signin?error=oauth&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}
