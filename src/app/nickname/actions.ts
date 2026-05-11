"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidNickname, normalizeAnswer } from "@/lib/puzzle/normalize";

export async function saveNickname(formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!isValidNickname(nickname)) {
    redirect("/nickname?error=invalid");
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

  if (error) redirect("/nickname?error=save");
  redirect("/");
}
