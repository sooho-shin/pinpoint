import { createAdminClient } from "@/lib/supabase/admin";
import { isAcceptedAnswer, normalizeAnswer } from "@/lib/puzzle/normalize";
import { getActivePublicationDateKst, getNextPublicationIso } from "@/lib/puzzle/time";
import { validatePublicNickname } from "@/lib/puzzle/validation";
import { claimAnonymousAttempt, getCompletedFeedbackAttempt } from "@/lib/puzzle/attempt-claim";
import { getActor } from "@/lib/puzzle/actor";
import { ATTEMPT_SELECT, getAttempt, TERMINAL_STATUSES } from "@/lib/puzzle/attempts";
import { createLeaderboardEntry, getDailyRankingParticipation, syncUserGroupLeaderboardEntries } from "@/lib/puzzle/leaderboard";
import { getTodayPublication } from "@/lib/puzzle/publication";
import { getProfile } from "@/lib/puzzle/profiles";
import { containsSpoilerText, publicAttempt, publicFeedback } from "@/lib/puzzle/server-format";
import type { Actor, AttemptRow, LeaderboardEntryRow, PublicationRow, PuzzleFeedbackRow, PuzzleRow, StreakLeaderboardRow } from "@/lib/puzzle/server-types";
import { addKstDate, recordDailyResult } from "@/lib/puzzle/streaks";
import { canWriteWinnerMessage, getWinnerMessage } from "@/lib/puzzle/winner-message";
import type {
  DailyRankingParticipation,
  NoPuzzleState,
  PuzzleFeedbackReaction,
  PuzzleFeedbackState,
  PuzzlePlayState,
  StreakLeaderboardState,
  SubmitResult,
  WinnerMessage
} from "@/lib/puzzle/types";

export { createRankingGroup, getGroupLeaderboard, joinRankingGroup } from "@/lib/puzzle/groups";

const FEEDBACK_REACTIONS = new Set<PuzzleFeedbackReaction>(["easy", "good", "hard", "tricky", "fun"]);
const LEADERBOARD_DISPLAY_LIMIT = 50;
const LEADERBOARD_RANK_SCAN_LIMIT = 5000;

function visiblePuzzleState(
  publication: PublicationRow,
  puzzle: PuzzleRow,
  attempt: AttemptRow | null,
  winnerMessage: WinnerMessage | null,
  requiresSignInForRanking: boolean
): PuzzlePlayState {
  const usedClueCount = attempt ? publicAttempt(attempt).usedClueCount : 1;
  const shouldShowAll = attempt ? TERMINAL_STATUSES.has(attempt.status) : false;
  const visibleCount = shouldShowAll ? 5 : usedClueCount;

  return {
    status: "ready",
    publicationId: publication.id,
    publishDateKst: publication.publish_date_kst,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    clues: puzzle.clues.slice(0, visibleCount),
    lockedCount: Math.max(0, 5 - visibleCount),
    attempt: attempt ? publicAttempt(attempt) : null,
    ...(shouldShowAll ? { answer: puzzle.answer } : {}),
    winnerMessage,
    requiresSignInForRanking
  };
}

export async function getTodayPayload(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const attempt = await claimAnonymousAttempt(publication.id, actor).then((claimed) => claimed ?? getAttempt(publication.id, actor));

  return visiblePuzzleState(publication, puzzle, attempt, null, false);
}

export async function startAttempt(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const existing = (await claimAnonymousAttempt(publication.id, actor)) ?? (await getAttempt(publication.id, actor));
  if (existing) {
    return visiblePuzzleState(publication, puzzle, existing, null, false);
  }

  const admin = createAdminClient();
  const insertPayload = {
    publication_id: publication.id,
    user_id: actor.userId,
    anonymous_session_id: actor.userId ? null : actor.anonymousSessionId,
    used_clue_count: 1,
    status: "playing",
    visibility: "private"
  };
  const { data: attempt, error } = await admin
    .from("attempts")
    .insert(insertPayload)
    .select(ATTEMPT_SELECT)
    .single();

  if (error) throw error;

  return visiblePuzzleState(publication, puzzle, attempt as AttemptRow, null, false);
}

export async function revealNextClue(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const attempt = (await claimAnonymousAttempt(publication.id, actor)) ?? (await getAttempt(publication.id, actor));
  if (!attempt) {
    await startAttempt();
    return revealNextClue();
  }
  if (TERMINAL_STATUSES.has(attempt.status)) {
    return visiblePuzzleState(publication, puzzle, attempt, null, false);
  }

  const nextCount = Math.min(5, Number(attempt.used_clue_count ?? 1) + 1);
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("attempts")
    .update({ used_clue_count: nextCount })
    .eq("id", attempt.id)
    .select(ATTEMPT_SELECT)
    .single();

  if (error) throw error;

  return visiblePuzzleState(publication, puzzle, updated as AttemptRow, null, false);
}

export async function submitGuess(rawGuess: string): Promise<SubmitResult | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const attempt = (await claimAnonymousAttempt(publication.id, actor)) ?? (await getAttempt(publication.id, actor));
  if (!attempt) {
    await startAttempt();
    return submitGuess(rawGuess);
  }

  const usedClueCount = Math.max(1, Math.min(5, Number(attempt.used_clue_count ?? 1)));
  if (TERMINAL_STATUSES.has(attempt.status)) {
    const [canWrite, participation] = attempt.status === "succeeded" && actor.userId
      ? await Promise.all([
          canWriteWinnerMessage(publication.id, actor.userId),
          getDailyRankingParticipation(publication.id, actor, attempt)
        ])
      : [false, await getDailyRankingParticipation(publication.id, actor, attempt)];
    return {
      status: attempt.status === "succeeded" ? "succeeded" : "failed",
      isCorrect: attempt.is_correct,
      attemptId: attempt.id,
      publicationId: publication.id,
      category: puzzle.category,
      difficulty: puzzle.difficulty,
      clues: puzzle.clues,
      lockedCount: 0,
      usedClueCount,
      elapsedMs: attempt.elapsed_ms,
      answer: puzzle.answer,
      isRanked: attempt.is_ranked,
      participation,
      canWriteWinnerMessage: canWrite
    };
  }

  const elapsedMs = Math.max(0, Date.now() - new Date(attempt.started_at).getTime());
  const normalizedGuess = normalizeAnswer(rawGuess);
  const accepted = [puzzle.answer, ...(puzzle.aliases ?? [])];
  const isCorrect = isAcceptedAnswer(rawGuess, accepted);
  const terminalFailure = !isCorrect && usedClueCount >= 5;
  const nextVisibleCount = isCorrect || terminalFailure ? 5 : Math.min(5, usedClueCount + 1);
  const nextStatus = isCorrect ? "succeeded" : terminalFailure ? "failed" : "playing";
  const submittedAt = new Date().toISOString();
  const profile = actor.userId ? await getProfile(actor.userId) : null;
  const canRank = Boolean(isCorrect && profile);
  const rankStatus = elapsedMs < 1000 ? "flagged" : "visible";

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("attempts")
    .update({
      submitted_at: submittedAt,
      elapsed_ms: elapsedMs,
      used_clue_count: isCorrect || terminalFailure ? usedClueCount : nextVisibleCount,
      submitted_answer: rawGuess,
      normalized_answer: normalizedGuess,
      is_correct: isCorrect,
      status: nextStatus,
      is_ranked: canRank,
      visibility: canRank ? "daily" : "private",
      flagged: canRank && rankStatus === "flagged",
      flag_reason: canRank && rankStatus === "flagged" ? "elapsed_ms_under_1000" : null
    })
    .eq("id", attempt.id)
    .select(ATTEMPT_SELECT)
    .single();

  if (error) throw error;
  const updatedAttempt = updated as AttemptRow;

  if (canRank && profile) {
    const created = await createLeaderboardEntry(updatedAttempt, profile.nickname, rankStatus);
    if (created && rankStatus === "visible" && actor.userId) {
      await syncUserGroupLeaderboardEntries(publication.id, actor.userId);
    }
  }

  const terminal = nextStatus !== "playing";
  if (terminal) await recordDailyResult(publication, updatedAttempt);

  const canWrite = terminal && isCorrect && canRank && actor.userId
    ? await canWriteWinnerMessage(publication.id, actor.userId)
    : false;
  const participation = terminal && isCorrect
    ? canRank
      ? rankStatus === "flagged"
        ? { status: "succeeded_not_visible", reason: "flagged" } satisfies DailyRankingParticipation
        : { status: "ranked" } satisfies DailyRankingParticipation
      : actor.userId
        ? { status: "requires_nickname" } satisfies DailyRankingParticipation
        : { status: "requires_anonymous_nickname" } satisfies DailyRankingParticipation
    : terminal
      ? { status: "failed" } satisfies DailyRankingParticipation
      : undefined;
  return {
    status: nextStatus,
    isCorrect,
    attemptId: updatedAttempt.id,
    publicationId: publication.id,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    clues: puzzle.clues.slice(0, terminal ? 5 : nextVisibleCount),
    lockedCount: terminal ? 0 : Math.max(0, 5 - nextVisibleCount),
    usedClueCount: updatedAttempt.used_clue_count ?? usedClueCount,
    elapsedMs: updatedAttempt.elapsed_ms,
    ...(terminal ? { answer: puzzle.answer } : {}),
    ...(canRank ? { isRanked: true, rankStatus } : { isRanked: false }),
    ...(participation ? { participation } : {}),
    canWriteWinnerMessage: canWrite
  };
}

export async function getDailyLeaderboard() {
  const actor = await getActor();
  const { publishDateKst, publication } = await getTodayPublication();
  if (!publication) {
    return { status: "no_puzzle", publishDateKst, rows: [], myRank: null, canWriteWinnerMessage: false };
  }

  const claimedAttempt = await claimAnonymousAttempt(publication.id, actor);
  const viewerAttempt = claimedAttempt ?? await getAttempt(publication.id, actor);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leaderboard_entries")
    .select("id,user_id,anonymous_session_id,nickname_snapshot,used_clue_count,elapsed_ms,submitted_at,rank_status")
    .eq("publication_id", publication.id)
    .eq("rank_status", "visible")
    .order("used_clue_count", { ascending: true })
    .order("elapsed_ms", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(LEADERBOARD_RANK_SCAN_LIMIT);

  if (error) throw error;

  const allRows = ((data ?? []) as LeaderboardEntryRow[]).map((row, index) => ({
    id: String(row.id),
    rank: index + 1,
    nickname: String(row.nickname_snapshot),
    usedClueCount: Number(row.used_clue_count),
    elapsedMs: Number(row.elapsed_ms),
    submittedAt: String(row.submitted_at),
    isMe: Boolean(
      (actor.userId && row.user_id === actor.userId)
      || (!actor.userId && actor.anonymousSessionId && row.anonymous_session_id === actor.anonymousSessionId)
    )
  }));
  const rows = allRows.slice(0, LEADERBOARD_DISPLAY_LIMIT);
  const myRank = allRows.find((row) => row.isMe) ?? null;
  const participation = await getDailyRankingParticipation(publication.id, actor, viewerAttempt);

  return {
    status: "ready",
    publishDateKst: publication.publish_date_kst,
    rows,
    myRank,
    canWriteWinnerMessage: await canWriteWinnerMessage(publication.id, actor.userId),
    participation
  };
}

export async function registerDailyLeaderboardNickname(rawNickname: string) {
  const nicknameResult = validatePublicNickname(rawNickname);
  if (!nicknameResult.ok) return { ok: false, error: nicknameResult.error };

  const actor = await getActor();
  const { publication } = await getTodayPublication();
  if (!publication) return { ok: false, error: "오늘 공개된 문제가 없습니다." };

  const attempt = (await claimAnonymousAttempt(publication.id, actor)) ?? (await getAttempt(publication.id, actor));
  if (!attempt || attempt.status === "playing") return { ok: false, error: "완료된 기록이 없습니다." };
  if (attempt.status !== "succeeded") return { ok: false, error: "정답 기록만 랭킹에 등록할 수 있습니다." };

  const profile = actor.userId ? await getProfile(actor.userId) : null;
  const nickname = profile?.nickname ?? nicknameResult.nickname;
  const elapsedMs = Number(attempt.elapsed_ms ?? 0);
  const rankStatus = elapsedMs < 1000 ? "flagged" : "visible";
  const created = await createLeaderboardEntry(attempt, nickname, rankStatus);
  if (created && rankStatus === "visible" && actor.userId) {
    await syncUserGroupLeaderboardEntries(publication.id, actor.userId);
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("attempts")
    .update({
      is_ranked: true,
      visibility: "daily",
      flagged: rankStatus === "flagged",
      flag_reason: rankStatus === "flagged" ? "elapsed_ms_under_1000" : null
    })
    .eq("id", attempt.id)
    .select(ATTEMPT_SELECT)
    .single();
  if (error) throw error;

  return {
    ok: true,
    participation: await getDailyRankingParticipation(publication.id, actor, updated as AttemptRow)
  };
}

export async function getStreakLeaderboard(): Promise<StreakLeaderboardState> {
  const actor = await getActor();
  const activePublishDateKst = getActivePublicationDateKst();
  const previousPublishDateKst = addKstDate(activePublishDateKst, -1);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_streaks")
    .select("user_id,current_streak,longest_streak,total_success_count,last_success_publish_date_kst,profiles(nickname)")
    .gt("current_streak", 0)
    .order("current_streak", { ascending: false })
    .order("last_success_publish_date_kst", { ascending: false })
    .order("longest_streak", { ascending: false })
    .order("total_success_count", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = ((data ?? []) as StreakLeaderboardRow[])
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const isLiveStreak = row.last_success_publish_date_kst === activePublishDateKst
        || row.last_success_publish_date_kst === previousPublishDateKst;
      return {
        id: row.user_id,
        rank: 0,
        nickname: profile?.nickname ?? "익명",
        currentStreak: isLiveStreak ? Number(row.current_streak) : 0,
        longestStreak: Number(row.longest_streak),
        totalSuccessCount: Number(row.total_success_count),
        lastSuccessPublishDateKst: row.last_success_publish_date_kst,
        isMe: Boolean(actor.userId && row.user_id === actor.userId)
      };
    })
    .filter((row) => row.currentStreak > 0)
    .sort((a, b) => (
      b.currentStreak - a.currentStreak
      || String(b.lastSuccessPublishDateKst ?? "").localeCompare(String(a.lastSuccessPublishDateKst ?? ""))
      || b.longestStreak - a.longestStreak
      || b.totalSuccessCount - a.totalSuccessCount
    ))
    .slice(0, 50)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    status: "ready",
    rows,
    myRank: rows.find((row) => row.isMe) ?? null
  };
}

export async function getCurrentWinnerMessage() {
  return getWinnerMessage();
}

export async function writeWinnerMessage(message: string) {
  const trimmed = message.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return { ok: false, error: "메시지는 1~100자로 입력해 주세요." };
  }

  const actor = await getActor();
  if (!actor.userId) return { ok: false, error: "로그인이 필요합니다." };
  const { publication } = await getTodayPublication();
  if (!publication) return { ok: false, error: "오늘 공개된 문제가 없습니다." };

  const profile = await getProfile(actor.userId);
  if (!profile) return { ok: false, error: "닉네임 설정이 필요합니다." };

  const admin = createAdminClient();
  const { data: topEntry, error: topEntryError } = await admin
    .from("leaderboard_entries")
    .select("id,user_id,nickname_snapshot")
    .eq("publication_id", publication.id)
    .eq("rank_status", "visible")
    .order("used_clue_count", { ascending: true })
    .order("elapsed_ms", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (topEntryError) throw topEntryError;
  if (!topEntry || topEntry.user_id !== actor.userId) {
    return { ok: false, error: "오늘의 랭킹 1등만 메시지를 남길 수 있습니다." };
  }

  const visibleFrom = new Date().toISOString();
  const visibleUntil = getNextPublicationIso();
  const { data: existing, error: existingError } = await admin
    .from("daily_winner_messages")
    .select("id")
    .eq("publication_id", publication.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await admin
      .from("daily_winner_messages")
      .update({
        leaderboard_entry_id: topEntry.id,
        user_id: actor.userId,
        nickname_snapshot: topEntry.nickname_snapshot,
        message: trimmed,
        message_status: "visible",
        visible_from: visibleFrom,
        visible_until: visibleUntil
      })
      .eq("id", existing.id);
    if (error) throw error;
    return { ok: true };
  }

  const { error } = await admin.from("daily_winner_messages").insert({
    publication_id: publication.id,
    leaderboard_entry_id: topEntry.id,
    user_id: actor.userId,
    nickname_snapshot: topEntry.nickname_snapshot,
    message: trimmed,
    message_status: "visible",
    visible_from: visibleFrom,
    visible_until: visibleUntil
  });

  if (error) throw error;
  return { ok: true };
}

export async function getDailyPuzzleFeedback(): Promise<PuzzleFeedbackState> {
  const actor = await getActor();
  const { publishDateKst, publication } = await getTodayPublication();
  if (!publication) {
    return {
      status: "no_puzzle",
      publishDateKst,
      canRead: false,
      canWrite: false,
      items: [],
      myFeedback: null,
      message: "오늘 공개된 문제가 없습니다."
    };
  }

  if (!actor.userId) {
    return {
      status: "ready",
      publishDateKst: publication.publish_date_kst,
      canRead: false,
      canWrite: false,
      items: [],
      myFeedback: null,
      message: "로그인하고 오늘 문제를 완료하면 플레이어 반응을 볼 수 있어요.",
      requiresSignIn: true
    };
  }

  const completedAttempt = await getCompletedFeedbackAttempt(publication.id, actor);
  if (!completedAttempt) {
    return {
      status: "ready",
      publishDateKst: publication.publish_date_kst,
      canRead: false,
      canWrite: false,
      items: [],
      myFeedback: null,
      message: "오늘 문제를 완료하면 플레이어 반응을 볼 수 있어요.",
      requiresSignIn: false
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("daily_puzzle_feedback")
    .select("id,user_id,nickname_snapshot,reaction,comment,created_at")
    .eq("publication_id", publication.id)
    .eq("feedback_status", "visible")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const items = ((data ?? []) as PuzzleFeedbackRow[]).map((row) => publicFeedback(row, actor.userId as string));
  const myFeedback = items.find((item) => item.isMe) ?? null;

  return {
    status: "ready",
    publishDateKst: publication.publish_date_kst,
    canRead: true,
    canWrite: true,
    items,
    myFeedback
  };
}

export async function writePuzzleFeedback(input: { reaction: string; comment: string }) {
  const reaction = String(input.reaction ?? "") as PuzzleFeedbackReaction;
  const comment = String(input.comment ?? "").trim();

  if (!FEEDBACK_REACTIONS.has(reaction)) {
    return { ok: false, error: "평가를 선택해 주세요." };
  }
  if (comment.length < 1 || comment.length > 140) {
    return { ok: false, error: "한마디는 1~140자로 입력해 주세요." };
  }

  const actor = await getActor();
  if (!actor.userId) return { ok: false, error: "로그인이 필요합니다." };

  const { publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { ok: false, error: "오늘 공개된 문제가 없습니다." };

  const [profile, completedAttempt] = await Promise.all([
    getProfile(actor.userId),
    getCompletedFeedbackAttempt(publication.id, actor)
  ]);
  if (!profile) return { ok: false, error: "닉네임 설정이 필요합니다." };
  if (!completedAttempt) return { ok: false, error: "오늘 문제를 완료하면 평가를 남길 수 있습니다." };
  if (containsSpoilerText(comment, puzzle)) {
    return { ok: false, error: "정답이나 단서를 직접 포함한 한마디는 남길 수 없습니다." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("daily_puzzle_feedback")
    .upsert({
      publication_id: publication.id,
      user_id: actor.userId,
      attempt_id: completedAttempt.id,
      nickname_snapshot: profile.nickname,
      reaction,
      comment,
      feedback_status: "visible"
    }, {
      onConflict: "publication_id,user_id"
    });

  if (error) throw error;
  return { ok: true };
}
