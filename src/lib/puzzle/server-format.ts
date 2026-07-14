import { isAnswerSpoilerMessage, normalizeAnswer } from "@/lib/puzzle/normalize";
import type { PublicAttempt, PuzzleFeedbackItem } from "@/lib/puzzle/types";
import type { AttemptRow, PuzzleFeedbackRow, PuzzleRow } from "@/lib/puzzle/server-types";

export function createInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

export function asClues(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).slice(0, 5);
}

export function publicAttempt(attempt: AttemptRow): PublicAttempt {
  return {
    id: attempt.id,
    status: attempt.status,
    usedClueCount: Math.max(1, Math.min(5, Number(attempt.used_clue_count ?? 1))),
    elapsedMs: attempt.elapsed_ms,
    isCorrect: attempt.is_correct,
    isRanked: attempt.is_ranked
  };
}

export function publicFeedback(row: PuzzleFeedbackRow, userId: string): PuzzleFeedbackItem {
  return {
    id: row.id,
    nickname: row.nickname_snapshot,
    reaction: row.reaction,
    comment: row.comment,
    createdAt: row.created_at,
    isMe: row.user_id === userId
  };
}

export function containsSpoilerText(comment: string, puzzle: PuzzleRow) {
  const normalizedComment = normalizeAnswer(comment);
  const forbiddenTerms = [
    puzzle.answer,
    ...(puzzle.aliases ?? []),
    ...puzzle.clues
  ]
    .map(normalizeAnswer)
    .filter((term) => term.length >= 2);

  return forbiddenTerms.some((term) => normalizedComment.includes(term));
}

export function containsAnswerSpoilerText(message: string, puzzle: PuzzleRow) {
  return isAnswerSpoilerMessage(message, [puzzle.answer, ...(puzzle.aliases ?? [])]);
}
