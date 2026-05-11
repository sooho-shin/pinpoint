import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAnswer } from "@/lib/puzzle/normalize";
import { getKstDateString, getNextPublicationIso } from "@/lib/puzzle/time";
import type { NoPuzzleState, PublicAttempt, PuzzlePlayState, SubmitResult, WinnerMessage } from "@/lib/puzzle/types";

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

type Actor = {
  userId: string | null;
  anonymousSessionId: string;
};

const ANONYMOUS_COOKIE = "pinpoint_anonymous_session";
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "abandoned"]);

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

async function getActor(): Promise<Actor> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANONYMOUS_COOKIE)?.value;
  const anonymousSessionId = existing || randomUUID();

  if (!existing) {
    cookieStore.set(ANONYMOUS_COOKIE, anonymousSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 120
    });
  }

  return {
    userId: user?.id ?? null,
    anonymousSessionId
  };
}

async function getTodayPublication() {
  const admin = createAdminClient();
  const publishDateKst = getKstDateString();
  const { data: publication, error: publicationError } = await admin
    .from("puzzle_publications")
    .select("id,puzzle_id,publish_date_kst,published_at")
    .eq("status", "published")
    .eq("publish_date_kst", publishDateKst)
    .maybeSingle();

  if (publicationError) throw publicationError;
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

  query = actor.userId
    ? query.eq("user_id", actor.userId)
    : query.eq("anonymous_session_id", actor.anonymousSessionId);

  const { data, error } = await query.maybeSingle();
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
  winnerMessage: WinnerMessage | null
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
    winnerMessage
  };
}

export async function getTodayPayload(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const [attempt, winnerMessage] = await Promise.all([
    getAttempt(publication.id, actor),
    getWinnerMessage(publication.id)
  ]);

  return visiblePuzzleState(publication, puzzle, attempt, winnerMessage);
}

export async function startAttempt(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const existing = await getAttempt(publication.id, actor);
  if (existing) {
    const winnerMessage = await getWinnerMessage(publication.id);
    return visiblePuzzleState(publication, puzzle, existing, winnerMessage);
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
  return visiblePuzzleState(publication, puzzle, attempt as AttemptRow, winnerMessage);
}

export async function revealNextClue(): Promise<PuzzlePlayState | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const attempt = await getAttempt(publication.id, actor);
  if (!attempt) return startAttempt();
  if (TERMINAL_STATUSES.has(attempt.status)) {
    const winnerMessage = await getWinnerMessage(publication.id);
    return visiblePuzzleState(publication, puzzle, attempt, winnerMessage);
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
  return visiblePuzzleState(publication, puzzle, updated as AttemptRow, winnerMessage);
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

export async function submitGuess(rawGuess: string): Promise<SubmitResult | NoPuzzleState> {
  const actor = await getActor();
  const { publishDateKst, publication, puzzle } = await getTodayPublication();
  if (!publication || !puzzle) return { status: "no_puzzle", publishDateKst };

  const attempt = await getAttempt(publication.id, actor);
  if (!attempt) {
    await startAttempt();
    return submitGuess(rawGuess);
  }

  const usedClueCount = Math.max(1, Math.min(5, Number(attempt.used_clue_count ?? 1)));
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
    await createLeaderboardEntry(updatedAttempt, profile.nickname, rankStatus);
  }

  const terminal = nextStatus !== "playing";
  return {
    status: nextStatus,
    isCorrect,
    publicationId: publication.id,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    clues: puzzle.clues.slice(0, terminal ? 5 : nextVisibleCount),
    lockedCount: terminal ? 0 : Math.max(0, 5 - nextVisibleCount),
    usedClueCount: updatedAttempt.used_clue_count ?? usedClueCount,
    elapsedMs: updatedAttempt.elapsed_ms,
    ...(terminal ? { answer: puzzle.answer } : {}),
    ...(canRank ? { isRanked: true, rankStatus } : { isRanked: false })
  };
}

export async function getDailyLeaderboard() {
  const actor = await getActor();
  const { publishDateKst, publication } = await getTodayPublication();
  if (!publication) {
    return { status: "no_puzzle", publishDateKst, rows: [], myRank: null, canWriteWinnerMessage: false };
  }

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
    isMe: actor.userId ? row.user_id === actor.userId : false
  }));
  const myRank = rows.find((row) => row.isMe) ?? null;

  return {
    status: "ready",
    publishDateKst: publication.publish_date_kst,
    rows,
    myRank,
    canWriteWinnerMessage: Boolean(myRank && myRank.rank === 1)
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
    .select("id,user_id")
    .eq("publication_id", publication.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.user_id !== actor.userId) {
      return { ok: false, error: "이미 다른 1등 메시지가 등록되어 있습니다." };
    }

    const { error } = await admin
      .from("daily_winner_messages")
      .update({
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
