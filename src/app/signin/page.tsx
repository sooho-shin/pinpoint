import { redirect } from "next/navigation";
import { AuthTemplate } from "@/components/templates/AuthTemplate";
import { signInWithGoogle } from "@/app/signin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.nickname) redirect(`/nickname?next=${encodeURIComponent(next)}`);
    redirect(next);
  }

  const error =
    params.error === "oauth"
      ? "Google 로그인을 시작하지 못했습니다."
      : undefined;

  return <AuthTemplate kind="signin" action={signInWithGoogle} next={next} error={error} />;
}
