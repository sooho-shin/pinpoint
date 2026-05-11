import { redirect } from "next/navigation";
import { ResultTemplate } from "@/components/templates/ResultTemplate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResultPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?next=/result");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.nickname) redirect("/nickname?next=/result");

  return <ResultTemplate />;
}
