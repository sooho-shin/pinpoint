import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidNickname, normalizeAnswer } from "@/lib/puzzle/normalize";

const SIGNUP_NICKNAME_COOKIE = "pinpoint_signup_nickname";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const cookieStore = await cookies();
      const signupNickname = safeDecode(String(cookieStore.get(SIGNUP_NICKNAME_COOKIE)?.value ?? "")).trim();
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.nickname && isValidNickname(signupNickname)) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          nickname: signupNickname,
          nickname_normalized: normalizeAnswer(signupNickname),
          avatar_url: user.user_metadata?.avatar_url ?? null
        });
        if (!error) {
          cookieStore.delete(SIGNUP_NICKNAME_COOKIE);
          return NextResponse.redirect(new URL(next, url.origin));
        }
      }

      cookieStore.delete(SIGNUP_NICKNAME_COOKIE);
      if (!profile?.nickname) {
        return NextResponse.redirect(new URL(`/nickname?next=${encodeURIComponent(next)}`, url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
