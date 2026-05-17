"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PRODUCTION_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinpoint-seven.vercel.app";

function safeNextPath(value: FormDataEntryValue | null) {
  const next = String(value ?? "/");
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function getRequestOrigin(headerStore: Headers) {
  if (process.env.NODE_ENV === "production") return PRODUCTION_ORIGIN;

  const origin = headerStore.get("origin");
  if (origin && !origin.includes("localhost")) return origin;

  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = headerStore.get("host");
  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));

  const supabase = await createSupabaseServerClient();
  const headerStore = await headers();
  const origin = getRequestOrigin(headerStore);
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
