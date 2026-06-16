import { createAdminClient } from "@/lib/supabase/admin";
import { COMPLETED_FEEDBACK_STATUSES } from "@/lib/puzzle/attempts";
import type { AttemptRow, PublicationRow, UserDailyResultRow } from "@/lib/puzzle/server-types";

export function addKstDate(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function computeUserStreak(results: UserDailyResultRow[]) {
  const ordered = [...results].sort((a, b) => a.publish_date_kst.localeCompare(b.publish_date_kst));
  let currentSuccessRun = 0;
  let longestStreak = 0;
  let totalSuccessCount = 0;
  let previousSuccessDate: string | null = null;
  let lastSuccessPublishDateKst: string | null = null;
  let lastResultPublishDateKst: string | null = null;

  for (const result of ordered) {
    lastResultPublishDateKst = result.publish_date_kst;

    if (!result.succeeded) {
      currentSuccessRun = 0;
      previousSuccessDate = null;
      continue;
    }

    totalSuccessCount += 1;
    currentSuccessRun = previousSuccessDate && addKstDate(previousSuccessDate, 1) === result.publish_date_kst
      ? currentSuccessRun + 1
      : 1;
    longestStreak = Math.max(longestStreak, currentSuccessRun);
    previousSuccessDate = result.publish_date_kst;
    lastSuccessPublishDateKst = result.publish_date_kst;
  }

  const latestResult = ordered.at(-1);
  return {
    currentStreak: latestResult?.succeeded ? currentSuccessRun : 0,
    longestStreak,
    totalSuccessCount,
    lastSuccessPublishDateKst,
    lastResultPublishDateKst
  };
}

export async function recomputeUserStreak(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_daily_results")
    .select("publish_date_kst,succeeded")
    .eq("user_id", userId)
    .order("publish_date_kst", { ascending: true });
  if (error) throw error;

  const streak = computeUserStreak((data ?? []) as UserDailyResultRow[]);
  const { error: upsertError } = await admin
    .from("user_streaks")
    .upsert({
      user_id: userId,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      total_success_count: streak.totalSuccessCount,
      last_success_publish_date_kst: streak.lastSuccessPublishDateKst,
      last_result_publish_date_kst: streak.lastResultPublishDateKst
    }, {
      onConflict: "user_id"
    });
  if (upsertError) throw upsertError;
}

export async function recordDailyResult(publication: PublicationRow, attempt: AttemptRow) {
  if (!attempt.user_id || !COMPLETED_FEEDBACK_STATUSES.has(attempt.status)) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_daily_results")
    .upsert({
      publication_id: publication.id,
      publish_date_kst: publication.publish_date_kst,
      user_id: attempt.user_id,
      attempt_id: attempt.id,
      result_status: attempt.status === "succeeded" ? "succeeded" : "failed",
      succeeded: attempt.status === "succeeded",
      submitted_at: attempt.submitted_at ?? new Date().toISOString()
    }, {
      onConflict: "publication_id,user_id"
    });
  if (error) throw error;

  await recomputeUserStreak(attempt.user_id);
}
