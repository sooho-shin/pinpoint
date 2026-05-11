import { redirect } from "next/navigation";
import { RankingTemplate } from "@/components/templates/RankingTemplate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RankingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?next=/ranking");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.nickname) redirect("/nickname?next=/ranking");

  return <RankingTemplate />;
}
