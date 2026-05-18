import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { normalizeAnswer } from "@/lib/puzzle/normalize";
import { publishDailyPuzzle } from "@/lib/puzzle/publication-admin";
import { getActivePublicationDateKst, getNextPublicationIso } from "@/lib/puzzle/time";
import type {
  NoPuzzleState,
  PublicAttempt,
  PuzzleFeedbackItem,
  PuzzleFeedbackReaction,
  PuzzleFeedbackState,
  PuzzlePlayState,
  StreakLeaderboardState,
  SubmitResult,
  WinnerMessage
} from "@/lib/puzzle/types";

type PublicationRow = {
  id: string;
  puzzle_id: string;
  publish_date_kst: string;
  published_at: string | null;
};

type PuzzleRow = {
  id: string;
  answer: string;
  aliases: string[];
  category: string;
  difficulty: number;
  clues: string[];
};

type AttemptRow = {
  id: string;
  publication_id: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  started_at: string;
  submitted_at: string | null;
  elapsed_ms: number | null;
  used_clue_count: number | null;
  is_correct: boolean;
  status: "playing" | "succeeded" | "failed" | "abandoned";
  is_ranked: boolean;
};

type UserDailyResultRow = {
  publish_date_kst: string;
  succeeded: boolean;
};

type StreakLeaderboardRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_success_count: number;
  last_success_publish_date_kst: string | null;
  profiles?: { nickname?: string | null } | Array<{ nickname?: string | null }> | null;
};

type PuzzleFeedbackRow = {
  id: string;
  user_id: string;
  nickname_snapshot: string;
  reaction: PuzzleFeedbackReaction;
  comment: string;
  created_at: string;
};

type GroupRow = {
  id: string;
  owner_user_id: string;
  publication_id: string;
  name: string | null;
  invite_code: string;
};

type Actor = {
  userId: string | null;
  anonymousSessionId: string | null;
};

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "abandoned"]);
const COMPLETED_FEEDBACK_STATUSES = new Set(["succeeded", "failed"]);
const FEEDBACK_REACTIONS = new Set<PuzzleFeedbackReaction>(["easy", "good", "hard", "tricky", "fun"]);
const ANONYMOUS_SESSION_COOKIE = "pinpoint_anon_session";

function createInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

function asClues(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).slice(0, 5);
}

function publicAttempt(attempt: AttemptRow): PublicAttempt {
  return {
    id: attempt.id,
    status: attempt.status,
    usedClueCount: Math.max(1, Math.min(5, Number(attempt.used_clue_count ?? 1))),
    elapsedMs: attempt.elapsed_ms,
    isCorrect: attempt.is_correct,
    isRanked: attempt.is_ranked
  };
}

function publicFeedback(row: PuzzleFeedbackRow, userId: string): PuzzleFeedbackItem {
  return {
    id: row.id,
    nickname: row.nickname_snapshot,
    reaction: row.reaction,
    comment: row.comment,
    createdAt: row.created_at,
    isMe: row.user_id === userId
  };
}

function addKstDate(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function computeUserStreak(results: UserDailyResultRow[]) {
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

async function recomputeUserStreak(userId: string) {
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

async function recordDailyResult(publication: PublicationRow, attempt: AttemptRow) {
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

async function getActor(): Promise<Actor> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;
  const existingAnonymousSessionId = existing && existing.length >= 16 ? existing : null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    return {
      userId: user.id,
      anonymousSessionId: existingAnonymousSessionId
    };
  }

  const anonymousSessionId = existingAnonymousSessionId ?? crypto.randomUUID();
  if (!existingAnonymousSessionId) {
    cookieStore.set(ANONYMOUS_SESSION_COOKIE, anonymousSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 45
    });
  }

  return {
    userId: null,
    anonymousSessionId
  };
}

async function getTodayPublication() {
  const admin = createAdminClient();
  const publishDateKst = getActivePublicationDateKst();
  let { data: publication, error: publicationError } = await admin
    .from("puzzle_publications")
    .select("id,puzzle_id,publish_date_kst,published_at")
    .eq("status", "published")
    .eq("publish_date_kst", publishDateKst)
    .maybeSingle();

  if (publicationError) throw publicationError;
  if (!publication) {
    const publishResult = await publishDailyPuzzle({ dateKst: publishDateKst });
    const published = publishResult.publications[0];
    if (published) {
      publication = {
        id: published.id,
        puzzle_id: published.puzzle_id,
        publish_date_kst: published.publish_date_kst,
        published_at: published.published_at
      };
    }
  }
  if (!publication) return { publishDateKst, publication: null, puzzle: null };

  const { data: puzzle, error: puzzleError } = await admin
    .from("puzzles")
    .select("id,answer,aliases,category,difficulty,clues")
    .eq("id", publication.puzzle_id)
    .single();

  if (puzzleError) throw puzzleError;

  return {
    publishDateKst,
    publication: publication as PublicationRow,
    puzzle: {
      ...(puzzle as Omit<PuzzleRow, "clues">),
      clues: asClues((puzzle as { clues: unknown }).clues)
    } satisfies PuzzleRow
  };
}

async function getAttempt(publicationId: string, actor: Actor) {
  const admin = createAdminClient();
  let query = admin
    .from("attempts")
    .select("id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked")
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (actor.userId) {
    query = query.eq("user_id", actor.userId);
  } else {
    if (!actor.anonymousSessionId) return null;
    query = query.eq("anonymous_session_id", actor.anonymousSessionId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as AttemptRow | null;
}

async function getAnonymousAttempt(publicationId: string, anonymousSessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attempts")
    .select("id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked")
    .eq("publication_id", publicationId)
    .eq("anonymous_session_id", anonymousSessionId)
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as AttemptRow | null;
}

async function getWinnerMessage(publicationId?: string): Promise<WinnerMessage | null> {
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

  const [attempt, winnerMessage] = await Promise.all([
    claimAnonymousAttempt(publication.id, actor).then((claimed) => claimed ?? getAttempt(publication.id, actor)),
    getWinnerMessage(publication.id)
  ]);

  return visiblePuzzleState(publication, puzzle, attempt, winnerMessage, !actor.userId);
}

export async function startAttempt(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const existing = (await claimAnonymousAttempt(publication.id, actor)) ?? (await getAttempt(publication.id, actor));
  if (existing) {
    const winnerMessage = await getWinnerMessage(publication.id);
    return visiblePuzzleState(publication, puzzle, existing, winnerMessage, !actor.userId);
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
    .select("id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked")
    .single();

  if (error) throw error;

  const winnerMessage = await getWinnerMessage(publication.id);
  return visiblePuzzleState(publication, puzzle, attempt as AttemptRow, winnerMessage, !actor.userId);
}

export async function revealNextClue(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const attempt = (await claimAnonymousAttempt(publication.id, actor)) ?? (await getAttempt(publication.id, actor));
  if (!attempt) return startAttempt();
  if (TERMINAL_STATUSES.has(attempt.status)) {
    const winnerMessage = await getWinnerMessage(publication.id);
    return visiblePuzzleState(publication, puzzle, attempt, winnerMessage, !actor.userId);
  }

  const nextCount = Math.min(5, Number(attempt.used_clue_count ?? 1) + 1);
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("attempts")
    .update({ used_clue_count: nextCount })
    .eq("id", attempt.id)
    .select("id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked")
    .single();

  if (error) throw error;

  const winnerMessage = await getWinnerMessage(publication.id);
  return visiblePuzzleState(publication, puzzle, updated as AttemptRow, winnerMessage, !actor.userId);
}

async function getProfile(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,nickname")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; nickname: string } | null;
}

async function getCompletedFeedbackAttempt(publicationId: string, actor: Actor) {
  if (!actor.userId) return null;
  const claimed = await claimAnonymousAttempt(publicationId, actor);
  const attempt = claimed ?? await getAttempt(publicationId, {
    userId: actor.userId,
    anonymousSessionId: null
  });
  if (!attempt || !COMPLETED_FEEDBACK_STATUSES.has(attempt.status)) return null;
  return attempt;
}

async function createLeaderboardEntry(attempt: AttemptRow, nickname: string, rankStatus: "visible" | "flagged") {
  if (!attempt.user_id || !attempt.elapsed_ms || !attempt.submitted_at || !attempt.used_clue_count) return false;
  const admin = createAdminClient();
  const { error } = await admin
    .from("leaderboard_entries")
    .insert({
      publication_id: attempt.publication_id,
      user_id: attempt.user_id,
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

async function getVisibleLeaderboardEntry(publicationId: string, userId: string) {
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

async function syncUserGroupLeaderboardEntries(publicationId: string, userId: string) {
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

async function canWriteWinnerMessage(publicationId: string, userId?: string | null) {
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

async function claimAnonymousAttempt(publicationId: string, actor: Actor) {
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
    .select("id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked")
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
        .select("id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked")
        .single();
      if (rankUpdateError) throw rankUpdateError;
      claimed = ranked as AttemptRow;
    }
  }

  return claimed;
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
    const canWrite = attempt.status === "succeeded" ? await canWriteWinnerMessage(publication.id, actor.userId) : false;
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
      canWriteWinnerMessage: canWrite
    };
  }

  const elapsedMs = Math.max(0, Date.now() - new Date(attempt.started_at).getTime());
  const normalizedGuess = normalizeAnswer(rawGuess);
  const accepted = [puzzle.answer, ...(puzzle.aliases ?? [])].map(normalizeAnswer);
  const isCorrect = accepted.includes(normalizedGuess);
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
    .select("id,publication_id,user_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,is_correct,status,is_ranked")
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

  const canWrite = terminal && isCorrect ? await canWriteWinnerMessage(publication.id, actor.userId) : false;
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
    canWriteWinnerMessage: canWrite
  };
}

export async function getDailyLeaderboard() {
  const actor = await getActor();
  const { publishDateKst, publication } = await getTodayPublication();
  if (!publication) {
    return { status: "no_puzzle", publishDateKst, rows: [], myRank: null, canWriteWinnerMessage: false };
  }

  await claimAnonymousAttempt(publication.id, actor);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leaderboard_entries")
    .select("id,user_id,nickname_snapshot,used_clue_count,elapsed_ms,submitted_at")
    .eq("publication_id", publication.id)
    .eq("rank_status", "visible")
    .order("used_clue_count", { ascending: true })
    .order("elapsed_ms", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(50);

  if (error) throw error;

  const rows = (data ?? []).map((row, index) => ({
    id: String(row.id),
    rank: index + 1,
    nickname: String(row.nickname_snapshot),
    usedClueCount: Number(row.used_clue_count),
    elapsedMs: Number(row.elapsed_ms),
    submittedAt: String(row.submitted_at),
    isMe: Boolean(actor.userId && row.user_id === actor.userId)
  }));
  const myRank = rows.find((row) => row.isMe) ?? null;

  return {
    status: "ready",
    publishDateKst: publication.publish_date_kst,
    rows,
    myRank,
    canWriteWinnerMessage: await canWriteWinnerMessage(publication.id, actor.userId)
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

async function getGroupByInviteCode(inviteCode: string) {
  const { publication } = await getTodayPublication();
  if (!publication) return { publication: null, group: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("groups")
    .select("id,owner_user_id,publication_id,name,invite_code")
    .eq("publication_id", publication.id)
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (error) throw error;

  return {
    publication,
    group: data as GroupRow | null
  };
}

async function addGroupMemberAndProjection(group: GroupRow, userId: string) {
  const admin = createAdminClient();
  const { error: memberError } = await admin
    .from("group_members")
    .upsert({ group_id: group.id, user_id: userId }, { onConflict: "group_id,user_id", ignoreDuplicates: true });
  if (memberError) throw memberError;

  await syncUserGroupLeaderboardEntries(group.publication_id, userId);
}

export async function createRankingGroup(input: { name?: string }) {
  const actor = await getActor();
  if (!actor.userId) return { ok: false, error: "로그인이 필요합니다.", requiresSignIn: true };

  const { publication } = await getTodayPublication();
  if (!publication) return { ok: false, error: "오늘 공개된 문제가 없습니다." };

  const profile = await getProfile(actor.userId);
  if (!profile) return { ok: false, error: "닉네임 설정이 필요합니다.", requiresNickname: true };

  const trimmedName = String(input.name ?? "").trim();
  const groupName = trimmedName.length > 0 ? trimmedName.slice(0, 24) : `${profile.nickname}의 그룹`;
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();
    const { data, error } = await admin
      .from("groups")
      .insert({
        owner_user_id: actor.userId,
        publication_id: publication.id,
        name: groupName,
        invite_code: inviteCode
      })
      .select("id,owner_user_id,publication_id,name,invite_code")
      .single();

    if (error && String(error.code) === "23505") continue;
    if (error) throw error;

    const group = data as GroupRow;
    await addGroupMemberAndProjection(group, actor.userId);
    return {
      ok: true,
      group: {
        id: group.id,
        name: group.name ?? "그룹 랭킹",
        inviteCode: group.invite_code
      }
    };
  }

  return { ok: false, error: "초대 코드를 만들지 못했습니다. 다시 시도해 주세요." };
}

export async function joinRankingGroup(inviteCode: string) {
  const code = inviteCode.trim();
  if (!code) return { ok: false, error: "초대 코드가 필요합니다." };

  const actor = await getActor();
  if (!actor.userId) return { ok: false, error: "로그인이 필요합니다.", requiresSignIn: true };

  const profile = await getProfile(actor.userId);
  if (!profile) return { ok: false, error: "닉네임 설정이 필요합니다.", requiresNickname: true };

  const { group } = await getGroupByInviteCode(code);
  if (!group) return { ok: false, error: "오늘 문제의 그룹 초대 링크가 아닙니다." };

  await addGroupMemberAndProjection(group, actor.userId);
  return {
    ok: true,
    group: {
      id: group.id,
      name: group.name ?? "그룹 랭킹",
      inviteCode: group.invite_code
    }
  };
}

export async function getGroupLeaderboard(inviteCode: string) {
  const code = inviteCode.trim();
  const actor = await getActor();
  const { publishDateKst, publication } = await getTodayPublication();
  if (!publication) {
    return { status: "no_puzzle", publishDateKst, rows: [], group: null };
  }
  if (!code) {
    return { status: "missing_code", publishDateKst, rows: [], group: null, message: "그룹 초대 링크가 필요합니다." };
  }

  const { group } = await getGroupByInviteCode(code);
  if (!group) {
    return {
      status: "not_found",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: null,
      message: "오늘 문제의 그룹 초대 링크가 아닙니다."
    };
  }

  if (!actor.userId) {
    return {
      status: "requires_sign_in",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
      message: "로그인하면 이 그룹 랭킹에 참여할 수 있습니다.",
      requiresSignIn: true
    };
  }

  const profile = await getProfile(actor.userId);
  if (!profile) {
    return {
      status: "requires_nickname",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
      message: "닉네임을 설정하면 이 그룹 랭킹에 참여할 수 있습니다.",
      requiresNickname: true
    };
  }

  await addGroupMemberAndProjection(group, actor.userId);

  const admin = createAdminClient();
  const { data: links, error: linkError } = await admin
    .from("group_leaderboard_entries")
    .select("leaderboard_entry_id")
    .eq("group_id", group.id);
  if (linkError) throw linkError;

  const leaderboardEntryIds = (links ?? []).map((row) => String(row.leaderboard_entry_id));
  if (leaderboardEntryIds.length === 0) {
    return {
      status: "ready",
      publishDateKst: publication.publish_date_kst,
      rows: [],
      group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
      isMember: true,
      myRank: null
    };
  }

  const { data, error } = await admin
    .from("leaderboard_entries")
    .select("id,user_id,nickname_snapshot,used_clue_count,elapsed_ms,submitted_at")
    .in("id", leaderboardEntryIds)
    .eq("rank_status", "visible")
    .order("used_clue_count", { ascending: true })
    .order("elapsed_ms", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  const rows = (data ?? []).map((row, index) => ({
    id: String(row.id),
    rank: index + 1,
    nickname: String(row.nickname_snapshot),
    usedClueCount: Number(row.used_clue_count),
    elapsedMs: Number(row.elapsed_ms),
    submittedAt: String(row.submitted_at),
    isMe: row.user_id === actor.userId
  }));

  return {
    status: "ready",
    publishDateKst: publication.publish_date_kst,
    rows,
    group: { id: group.id, name: group.name ?? "그룹 랭킹", inviteCode: group.invite_code },
    isMember: true,
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

  const { publication } = await getTodayPublication();
  if (!publication) return { ok: false, error: "오늘 공개된 문제가 없습니다." };

  const [profile, completedAttempt] = await Promise.all([
    getProfile(actor.userId),
    getCompletedFeedbackAttempt(publication.id, actor)
  ]);
  if (!profile) return { ok: false, error: "닉네임 설정이 필요합니다." };
  if (!completedAttempt) return { ok: false, error: "오늘 문제를 완료하면 평가를 남길 수 있습니다." };

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
