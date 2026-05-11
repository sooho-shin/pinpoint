import { redirect } from "next/navigation";
import { DailyPuzzleTemplate } from "@/components/templates/DailyPuzzleTemplate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?next=/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.nickname) redirect("/nickname?next=/");

  return <DailyPuzzleTemplate />;
}
