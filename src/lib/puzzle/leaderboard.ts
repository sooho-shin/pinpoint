import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/puzzle/profiles";
import type { DailyRankingParticipation } from "@/lib/puzzle/types";
import type { Actor, AttemptRow } from "@/lib/puzzle/server-types";

export async function createLeaderboardEntry(attempt: AttemptRow, nickname: string, rankStatus: "visible" | "flagged") {
  if (
    (!attempt.user_id && !attempt.anonymous_session_id)
    || attempt.elapsed_ms === null
    || !attempt.submitted_at
    || attempt.used_clue_count === null
  ) return false;
  const admin = createAdminClient();
  const { error } = await admin
    .from("leaderboard_entries")
    .insert({
      publication_id: attempt.publication_id,
      user_id: attempt.user_id,
      anonymous_session_id: attempt.user_id ? null : attempt.anonymous_session_id,
      attempt_id: attempt.id,
      nickname_snapshot: nickname,
      used_clue_count: attempt.used_clue_count,
      elapsed_ms: attempt.elapsed_ms,
      submitted_at: attempt.submitted_at,
      rank_status: rankStatus
    });

  if (!error) return true;
  if (String(error.code) === "23505") return true;
  throw error;
}

export async function getVisibleLeaderboardEntry(publicationId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leaderboard_entries")
    .select("id")
    .eq("publication_id", publicationId)
    .eq("user_id", userId)
    .eq("rank_status", "visible")
    .maybeSingle();
  if (error) throw error;
  return data ? String(data.id) : null;
}

async function getLeaderboardEntryRankStatus(publicationId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leaderboard_entries")
    .select("rank_status")
    .eq("publication_id", publicationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.rank_status ? String(data.rank_status) : null;
}

async function getAnonymousLeaderboardEntryRankStatus(publicationId: string, anonymousSessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leaderboard_entries")
    .select("rank_status")
    .eq("publication_id", publicationId)
    .eq("anonymous_session_id", anonymousSessionId)
    .maybeSingle();
  if (error) throw error;
  return data?.rank_status ? String(data.rank_status) : null;
}

export async function getDailyRankingParticipation(publicationId: string, actor: Actor, attempt: AttemptRow | null): Promise<DailyRankingParticipation> {
  if (!attempt || attempt.status === "playing") return { status: "not_completed" };
  if (attempt.status === "failed") return { status: "failed" };
  if (attempt.status !== "succeeded") return { status: "not_completed" };

  if (!actor.userId) {
    if (!actor.anonymousSessionId) return { status: "requires_anonymous_nickname" };
    const rankStatus = await getAnonymousLeaderboardEntryRankStatus(publicationId, actor.anonymousSessionId);
    if (rankStatus === "visible") return { status: "ranked" };
    if (rankStatus === "flagged") return { status: "succeeded_not_visible", reason: "flagged" };
    return { status: "requires_anonymous_nickname" };
  }

  const profile = await getProfile(actor.userId);
  if (!profile) return { status: "requires_nickname" };

  const rankStatus = await getLeaderboardEntryRankStatus(publicationId, actor.userId);
  if (rankStatus === "visible") return { status: "ranked" };
  if (rankStatus === "flagged") return { status: "succeeded_not_visible", reason: "flagged" };
  return { status: "succeeded_not_visible", reason: "unknown" };
}

export async function syncUserGroupLeaderboardEntries(publicationId: string, userId: string) {
  const leaderboardEntryId = await getVisibleLeaderboardEntry(publicationId, userId);
  if (!leaderboardEntryId) return;

  const admin = createAdminClient();
  const { data: memberships, error: membershipError } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (membershipError) throw membershipError;

  const groupIds = [...new Set((memberships ?? []).map((row) => String(row.group_id)))];
  if (groupIds.length === 0) return;

  const { data: groups, error: groupError } = await admin
    .from("groups")
    .select("id")
    .eq("publication_id", publicationId)
    .in("id", groupIds);
  if (groupError) throw groupError;

  const rows = (groups ?? []).map((group) => ({
    group_id: String(group.id),
    leaderboard_entry_id: leaderboardEntryId
  }));
  if (rows.length === 0) return;

  const { error } = await admin
    .from("group_leaderboard_entries")
    .upsert(rows, { onConflict: "group_id,leaderboard_entry_id", ignoreDuplicates: true });
  if (error) throw error;
}
