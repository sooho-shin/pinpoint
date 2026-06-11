import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActor } from "@/lib/puzzle/api";
import { isAcceptedAnswer, normalizeAnswer } from "@/lib/puzzle/normalize";
import { validateCustomGameInput, validatePublicNickname } from "@/lib/puzzle/validation";

type CustomGameRow = {
  id: string;
  play_slug: string;
  answer: string;
  aliases: string[];
  clues: string[];
  normalized_answer: string;
  status: "active" | "hidden" | "deleted";
  report_count: number;
  created_at: string;
};

type CustomAttemptRow = {
  id: string;
  custom_game_id: string;
  anonymous_session_id: string;
  started_at: string;
  submitted_at: string | null;
  elapsed_ms: number | null;
  used_clue_count: number | null;
  submitted_answer: string | null;
  normalized_answer: string | null;
  is_correct: boolean;
  status: "playing" | "succeeded" | "failed" | "abandoned";
  is_ranked: boolean;
  nickname_snapshot: string | null;
  rank_status: "visible" | "flagged" | "hidden";
};

const CUSTOM_GAME_CREATE_LIMIT_PER_HOUR = 10;
const CUSTOM_GAME_RANK_LIMIT = 100;
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "abandoned"]);

function randomToken(byteLength = 18) {
  return randomBytes(byteLength).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function asClues(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).slice(0, 5);
}

function publicGameState(game: CustomGameRow, attempt: CustomAttemptRow | null) {
  const usedClueCount = Math.max(1, Math.min(5, Number(attempt?.used_clue_count ?? 1)));
  const terminal = attempt ? TERMINAL_STATUSES.has(attempt.status) : false;
  const visibleCount = terminal ? 5 : usedClueCount;
  return {
    status: "ready" as const,
    game: {
      id: game.id,
      slug: game.play_slug,
      status: game.status,
      createdAt: game.created_at
    },
    clues: game.clues.slice(0, visibleCount),
    lockedCount: Math.max(0, 5 - visibleCount),
    attempt: attempt
      ? {
          id: attempt.id,
          status: attempt.status,
          usedClueCount,
          elapsedMs: attempt.elapsed_ms,
          isCorrect: attempt.is_correct,
          isRanked: attempt.is_ranked,
          nickname: attempt.nickname_snapshot
        }
      : null,
    ...(terminal ? { answer: game.answer } : {})
  };
}

async function getCustomGameBySlug(slug: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_games")
    .select("id,play_slug,answer,aliases,clues,normalized_answer,status,report_count,created_at")
    .eq("play_slug", slug)
    .neq("status", "deleted")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...(data as Omit<CustomGameRow, "clues">),
    clues: asClues((data as { clues: unknown }).clues)
  } satisfies CustomGameRow;
}

async function getCustomAttempt(customGameId: string, anonymousSessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_game_attempts")
    .select("id,custom_game_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,submitted_answer,normalized_answer,is_correct,status,is_ranked,nickname_snapshot,rank_status")
    .eq("custom_game_id", customGameId)
    .eq("anonymous_session_id", anonymousSessionId)
    .maybeSingle();
  if (error) throw error;
  return data as CustomAttemptRow | null;
}

async function requireActiveGame(slug: string) {
  const game = await getCustomGameBySlug(slug);
  if (!game) return { ok: false as const, status: "not_found" as const };
  if (game.status !== "active") return { ok: false as const, status: game.status };
  return { ok: true as const, game };
}

export async function createCustomGame(input: { answer: string; clues: string[] }) {
  const actor = await getActor();
  if (!actor.anonymousSessionId) return { ok: false, error: "익명 세션을 만들지 못했습니다." };

  const validation = validateCustomGameInput(input);
  if (!validation.ok) return { ok: false, error: validation.error };

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("custom_games")
    .select("id", { count: "exact", head: true })
    .eq("creator_anonymous_session_id", actor.anonymousSessionId)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= CUSTOM_GAME_CREATE_LIMIT_PER_HOUR) {
    return { ok: false, error: "잠시 후 다시 만들어 주세요." };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const playSlug = randomToken(12);
    const adminToken = randomToken(24);
    const { data, error } = await admin
      .from("custom_games")
      .insert({
        creator_anonymous_session_id: actor.anonymousSessionId,
        play_slug: playSlug,
        admin_token_hash: hashToken(adminToken),
        answer: validation.answer,
        aliases: [],
        clues: validation.clues,
        normalized_answer: normalizeAnswer(validation.answer),
        status: "active"
      })
      .select("id,play_slug,status,created_at")
      .single();
    if (error && String(error.code) === "23505") continue;
    if (error) throw error;
    return {
      ok: true,
      game: {
        id: String(data.id),
        slug: String(data.play_slug),
        status: String(data.status),
        createdAt: String(data.created_at)
      },
      playPath: `/custom/${data.play_slug}`,
      adminPath: `/custom/manage/${adminToken}`
    };
  }

  return { ok: false, error: "공유 링크를 만들지 못했습니다. 다시 시도해 주세요." };
}

export async function getCustomGamePayload(slug: string) {
  const resolved = await requireActiveGame(slug);
  if (!resolved.ok) return { status: resolved.status };
  const actor = await getActor();
  if (!actor.anonymousSessionId) return { status: "error", message: "익명 세션을 만들지 못했습니다." };
  const attempt = await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
  return publicGameState(resolved.game, attempt);
}

export async function startCustomGame(slug: string) {
  const resolved = await requireActiveGame(slug);
  if (!resolved.ok) return { status: resolved.status };
  const actor = await getActor();
  if (!actor.anonymousSessionId) return { status: "error", message: "익명 세션을 만들지 못했습니다." };

  const existing = await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
  if (existing) return publicGameState(resolved.game, existing);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_game_attempts")
    .insert({
      custom_game_id: resolved.game.id,
      anonymous_session_id: actor.anonymousSessionId,
      used_clue_count: 1,
      status: "playing"
    })
    .select("id,custom_game_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,submitted_answer,normalized_answer,is_correct,status,is_ranked,nickname_snapshot,rank_status")
    .single();
  if (error) {
    if (String(error.code) === "23505") {
      const attempt = await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
      return publicGameState(resolved.game, attempt);
    }
    throw error;
  }
  return publicGameState(resolved.game, data as CustomAttemptRow);
}

export async function revealCustomGameClue(slug: string) {
  const resolved = await requireActiveGame(slug);
  if (!resolved.ok) return { status: resolved.status };
  const actor = await getActor();
  if (!actor.anonymousSessionId) return { status: "error", message: "익명 세션을 만들지 못했습니다." };
  const existing = await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
  if (!existing) {
    await startCustomGame(slug);
  }
  const attempt = existing ?? await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
  if (!attempt) return startCustomGame(slug);
  if (TERMINAL_STATUSES.has(attempt.status)) return publicGameState(resolved.game, attempt);

  const admin = createAdminClient();
  const nextCount = Math.min(5, Number(attempt.used_clue_count ?? 1) + 1);
  const { data, error } = await admin
    .from("custom_game_attempts")
    .update({ used_clue_count: nextCount })
    .eq("id", attempt.id)
    .select("id,custom_game_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,submitted_answer,normalized_answer,is_correct,status,is_ranked,nickname_snapshot,rank_status")
    .single();
  if (error) throw error;
  return publicGameState(resolved.game, data as CustomAttemptRow);
}

export async function submitCustomGameGuess(slug: string, rawGuess: string) {
  const resolved = await requireActiveGame(slug);
  if (!resolved.ok) return { status: resolved.status };
  const actor = await getActor();
  if (!actor.anonymousSessionId) return { status: "error", message: "익명 세션을 만들지 못했습니다." };
  const existing = await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
  if (!existing) {
    await startCustomGame(slug);
  }
  const attempt = existing ?? await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
  if (!attempt) return startCustomGame(slug);
  if (TERMINAL_STATUSES.has(attempt.status)) return publicGameState(resolved.game, attempt);

  const usedClueCount = Math.max(1, Math.min(5, Number(attempt.used_clue_count ?? 1)));
  const isCorrect = isAcceptedAnswer(rawGuess, [resolved.game.answer, ...(resolved.game.aliases ?? [])]);
  const terminalFailure = !isCorrect && usedClueCount >= 5;
  const nextVisibleCount = isCorrect || terminalFailure ? 5 : Math.min(5, usedClueCount + 1);
  const nextStatus = isCorrect ? "succeeded" : terminalFailure ? "failed" : "playing";
  const elapsedMs = Math.max(0, Date.now() - new Date(attempt.started_at).getTime());

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_game_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      elapsed_ms: elapsedMs,
      used_clue_count: isCorrect || terminalFailure ? usedClueCount : nextVisibleCount,
      submitted_answer: rawGuess,
      normalized_answer: normalizeAnswer(rawGuess),
      is_correct: isCorrect,
      status: nextStatus
    })
    .eq("id", attempt.id)
    .select("id,custom_game_id,anonymous_session_id,started_at,submitted_at,elapsed_ms,used_clue_count,submitted_answer,normalized_answer,is_correct,status,is_ranked,nickname_snapshot,rank_status")
    .single();
  if (error) throw error;
  return publicGameState(resolved.game, data as CustomAttemptRow);
}

export async function getCustomGameRanking(slug: string) {
  const game = await getCustomGameBySlug(slug);
  if (!game || game.status === "deleted") return { status: "not_found", rows: [] };
  if (game.status !== "active") return { status: game.status, rows: [] };
  const actor = await getActor();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_game_attempts")
    .select("id,anonymous_session_id,nickname_snapshot,used_clue_count,elapsed_ms,submitted_at,rank_status")
    .eq("custom_game_id", game.id)
    .eq("is_ranked", true)
    .eq("rank_status", "visible")
    .order("used_clue_count", { ascending: true })
    .order("elapsed_ms", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(CUSTOM_GAME_RANK_LIMIT);
  if (error) throw error;
  const rows = (data ?? []).map((row, index) => ({
    id: String(row.id),
    rank: index + 1,
    nickname: String(row.nickname_snapshot ?? "익명"),
    usedClueCount: Number(row.used_clue_count),
    elapsedMs: Number(row.elapsed_ms),
    submittedAt: String(row.submitted_at),
    isMe: Boolean(actor.anonymousSessionId && row.anonymous_session_id === actor.anonymousSessionId)
  }));
  return { status: "ready", game: { slug: game.play_slug }, rows, myRank: rows.find((row) => row.isMe) ?? null };
}

export async function registerCustomGameRanking(slug: string, rawNickname: string) {
  const nicknameResult = validatePublicNickname(rawNickname);
  if (!nicknameResult.ok) return { ok: false, error: nicknameResult.error };
  const resolved = await requireActiveGame(slug);
  if (!resolved.ok) return { ok: false, error: "랭킹에 등록할 수 없는 게임입니다." };
  const actor = await getActor();
  if (!actor.anonymousSessionId) return { ok: false, error: "익명 세션을 만들지 못했습니다." };
  const attempt = await getCustomAttempt(resolved.game.id, actor.anonymousSessionId);
  if (!attempt || attempt.status !== "succeeded") return { ok: false, error: "정답 기록만 랭킹에 등록할 수 있습니다." };

  const rankStatus = "visible";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_game_attempts")
    .update({
      is_ranked: true,
      nickname_snapshot: nicknameResult.nickname,
      rank_status: rankStatus
    })
    .eq("id", attempt.id)
    .eq("is_ranked", false)
    .select("id,rank_status,nickname_snapshot")
    .maybeSingle();
  if (error) throw error;
  return {
    ok: true,
    ranked: Boolean(data),
    rankStatus,
    nickname: nicknameResult.nickname
  };
}

export async function reportCustomGame(slug: string, reason: string) {
  const resolved = await requireActiveGame(slug);
  if (!resolved.ok) return { ok: false, error: "신고할 수 없는 게임입니다." };
  const actor = await getActor();
  if (!actor.anonymousSessionId) return { ok: false, error: "익명 세션을 만들지 못했습니다." };
  const trimmedReason = reason.trim().slice(0, 160);
  if (!trimmedReason) return { ok: false, error: "신고 사유를 입력해 주세요." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("custom_game_reports")
    .insert({
      custom_game_id: resolved.game.id,
      anonymous_session_id: actor.anonymousSessionId,
      reason: trimmedReason
    });
  if (error && String(error.code) !== "23505") throw error;

  const { count, error: countError } = await admin
    .from("custom_game_reports")
    .select("id", { count: "exact", head: true })
    .eq("custom_game_id", resolved.game.id);
  if (countError) throw countError;
  await admin
    .from("custom_games")
    .update({
      report_count: count ?? 1,
      ...(Number(count ?? 0) >= 5 ? { status: "hidden" } : {})
    })
    .eq("id", resolved.game.id);

  return { ok: true };
}

async function getGameByAdminToken(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_games")
    .select("id,play_slug,status,report_count,created_at")
    .eq("admin_token_hash", hashToken(token))
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; play_slug: string; status: "active" | "hidden" | "deleted"; report_count: number; created_at: string } | null;
}

export async function getCustomGameAdmin(token: string) {
  const game = await getGameByAdminToken(token);
  if (!game) return { status: "not_found" };
  return {
    status: "ready",
    game: {
      slug: game.play_slug,
      status: game.status,
      reportCount: game.report_count,
      createdAt: game.created_at
    }
  };
}

export async function updateCustomGameAdmin(token: string, action: "hide" | "delete") {
  const game = await getGameByAdminToken(token);
  if (!game) return { ok: false, error: "관리 링크가 올바르지 않습니다." };
  const nextStatus = action === "delete" ? "deleted" : "hidden";
  const admin = createAdminClient();
  const { error } = await admin
    .from("custom_games")
    .update({ status: nextStatus })
    .eq("id", game.id);
  if (error) throw error;
  return { ok: true, status: nextStatus };
}
