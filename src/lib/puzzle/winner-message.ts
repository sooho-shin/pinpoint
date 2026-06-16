import { createAdminClient } from "@/lib/supabase/admin";
import type { WinnerMessage } from "@/lib/puzzle/types";

export async function getWinnerMessage(publicationId?: string): Promise<WinnerMessage | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  let query = admin
    .from("daily_winner_messages")
    .select("nickname_snapshot,message,visible_until")
    .eq("message_status", "visible")
    .lte("visible_from", now)
    .gt("visible_until", now)
    .order("created_at", { ascending: false })
    .limit(1);

  if (publicationId) query = query.eq("publication_id", publicationId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    nickname: String(data.nickname_snapshot),
    message: String(data.message),
    visibleUntil: String(data.visible_until)
  };
}

export async function canWriteWinnerMessage(publicationId: string, userId?: string | null) {
  if (!userId) return false;
  const admin = createAdminClient();
  const { data: topEntry, error: topEntryError } = await admin
    .from("leaderboard_entries")
    .select("user_id")
    .eq("publication_id", publicationId)
    .eq("rank_status", "visible")
    .order("used_clue_count", { ascending: true })
    .order("elapsed_ms", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (topEntryError) throw topEntryError;
  if (!topEntry || topEntry.user_id !== userId) return false;
  return true;
}
