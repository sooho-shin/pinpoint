import { NextResponse, type NextRequest } from "next/server";
import { logRouteError } from "@/lib/api-error";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getPublicSiteOrigin(request.headers);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const next = safeNextPath(url.searchParams.get("next"));

  if (oauthError) {
    console.warn("[auth/callback] OAuth provider returned an error", {
      error: oauthError,
      description: url.searchParams.get("error_description")
    });
    return NextResponse.redirect(new URL(`/signin?error=oauth&next=${encodeURIComponent(next)}`, origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logRouteError("auth/callback", error);
      return NextResponse.redirect(new URL(`/signin?error=oauth&next=${encodeURIComponent(next)}`, origin));
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.nickname) {
        return NextResponse.redirect(new URL(`/nickname?next=${encodeURIComponent(next)}`, origin));
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL(`/signin?error=oauth&next=${encodeURIComponent(next)}`, origin));
}
