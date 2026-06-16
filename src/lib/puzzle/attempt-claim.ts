import { createAdminClient } from "@/lib/supabase/admin";
import { ATTEMPT_SELECT, COMPLETED_FEEDBACK_STATUSES, getAnonymousAttempt, getAttempt } from "@/lib/puzzle/attempts";
import { createLeaderboardEntry, syncUserGroupLeaderboardEntries } from "@/lib/puzzle/leaderboard";
import { getTodayPublication } from "@/lib/puzzle/publication";
import { getProfile } from "@/lib/puzzle/profiles";
import { recordDailyResult } from "@/lib/puzzle/streaks";
import type { Actor, AttemptRow } from "@/lib/puzzle/server-types";

export async function claimAnonymousAttempt(publicationId: string, actor: Actor) {
  if (!actor.userId || !actor.anonymousSessionId) return null;

  const existingUserAttempt = await getAttempt(publicationId, {
    userId: actor.userId,
    anonymousSessionId: null
  });
  if (existingUserAttempt) return existingUserAttempt;

  const anonymousAttempt = await getAnonymousAttempt(publicationId, actor.anonymousSessionId);
  if (!anonymousAttempt) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attempts")
    .update({ user_id: actor.userId })
    .eq("id", anonymousAttempt.id)
    .is("user_id", null)
    .select(ATTEMPT_SELECT)
    .single();

  if (error) {
    if (String(error.code) === "23505") {
      return getAttempt(publicationId, {
        userId: actor.userId,
        anonymousSessionId: null
      });
    }
    throw error;
  }

  let claimed = data as AttemptRow;
  if (COMPLETED_FEEDBACK_STATUSES.has(claimed.status)) {
    const { publication } = await getTodayPublication();
    if (publication?.id === publicationId) await recordDailyResult(publication, claimed);
  }

  if (claimed.status === "succeeded" && !claimed.is_ranked) {
    const profile = await getProfile(actor.userId);
    if (profile) {
      const elapsedMs = Number(claimed.elapsed_ms ?? 0);
      const rankStatus = elapsedMs < 1000 ? "flagged" : "visible";
      const created = await createLeaderboardEntry(claimed, profile.nickname, rankStatus);
      if (created && rankStatus === "visible") {
        await syncUserGroupLeaderboardEntries(publicationId, actor.userId);
      }
      const { data: ranked, error: rankUpdateError } = await admin
        .from("attempts")
        .update({
          is_ranked: true,
          visibility: "daily",
          flagged: rankStatus === "flagged",
          flag_reason: rankStatus === "flagged" ? "elapsed_ms_under_1000" : null
        })
        .eq("id", claimed.id)
        .select(ATTEMPT_SELECT)
        .single();
      if (rankUpdateError) throw rankUpdateError;
      claimed = ranked as AttemptRow;
    }
  }

  return claimed;
}

export async function getCompletedFeedbackAttempt(publicationId: string, actor: Actor) {
  if (!actor.userId) return null;
  const claimed = await claimAnonymousAttempt(publicationId, actor);
  const attempt = claimed ?? await getAttempt(publicationId, {
    userId: actor.userId,
    anonymousSessionId: null
  });
  if (!attempt || !COMPLETED_FEEDBACK_STATUSES.has(attempt.status)) return null;
  return attempt;
}
