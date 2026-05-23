"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidNickname, normalizeAnswer } from "@/lib/puzzle/normalize";

function safeNextPath(value: FormDataEntryValue | null) {
  const next = String(value ?? "/");
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function nicknameErrorCode(error: { code?: string; message?: string }) {
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501" || /permission|rls|policy/i.test(error.message ?? "")) return "permission";
  return "save";
}

export async function saveNickname(formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const next = safeNextPath(formData.get("next"));
  if (!isValidNickname(nickname)) {
    redirect(`/nickname?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    nickname,
    nickname_normalized: normalizeAnswer(nickname),
    avatar_url: user.user_metadata?.avatar_url ?? null
  });

  if (error) redirect(`/nickname?error=${nicknameErrorCode(error)}&next=${encodeURIComponent(next)}`);
  redirect(next);
}
