import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Actor } from "@/lib/puzzle/server-types";

export const ANONYMOUS_SESSION_COOKIE = "pinpoint_anon_session";
export const SHARE_GROUP_COOKIE = "pinpoint_share_group";

function anonymousCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 45
  };
}

export async function getActor(): Promise<Actor> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;
  const existingAnonymousSessionId = existing && existing.length >= 16 ? existing : null;
  const hasSupabaseAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));

  if (!hasSupabaseAuthCookie) {
    const anonymousSessionId = existingAnonymousSessionId ?? crypto.randomUUID();
    if (!existingAnonymousSessionId) {
      cookieStore.set(ANONYMOUS_SESSION_COOKIE, anonymousSessionId, anonymousCookieOptions());
    }

    return {
      userId: null,
      anonymousSessionId
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    return {
      userId: user.id,
      anonymousSessionId: existingAnonymousSessionId
    };
  }

  const anonymousSessionId = existingAnonymousSessionId ?? crypto.randomUUID();
  if (!existingAnonymousSessionId) {
    cookieStore.set(ANONYMOUS_SESSION_COOKIE, anonymousSessionId, anonymousCookieOptions());
  }

  return {
    userId: null,
    anonymousSessionId
  };
}
