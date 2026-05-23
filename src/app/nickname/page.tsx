import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthTemplate } from "@/components/templates/AuthTemplate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveNickname } from "@/app/nickname/actions";

export const metadata: Metadata = {
  title: "닉네임 설정",
  description: "Narrow 닉네임 설정",
  robots: {
    index: false,
    follow: false
  }
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function NicknamePage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();

  const fallbackName = String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? "").slice(0, 12);
  const error =
    params.error === "invalid"
      ? "닉네임은 2~12자의 한국어, 영문, 숫자로 입력해 주세요."
      : params.error === "duplicate"
        ? "이미 사용 중인 닉네임입니다."
        : params.error === "permission"
          ? "로그인 세션을 확인하지 못했습니다. 다시 로그인해 주세요."
          : params.error === "save"
            ? "닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : undefined;

  return <AuthTemplate kind="nickname" action={saveNickname} defaultNickname={profile?.nickname ?? fallbackName} error={error} next={next} />;
}
