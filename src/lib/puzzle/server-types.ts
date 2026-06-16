import type { PuzzleFeedbackReaction } from "@/lib/puzzle/types";

export type PublicationRow = {
  id: string;
  puzzle_id: string;
  publish_date_kst: string;
  published_at: string | null;
};

export type PuzzleRow = {
  id: string;
  answer: string;
  aliases: string[];
  category: string;
  difficulty: number;
  clues: string[];
};

export type AttemptRow = {
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

export type LeaderboardEntryRow = {
  id: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  nickname_snapshot: string;
  used_clue_count: number;
  elapsed_ms: number;
  submitted_at: string;
  rank_status: string;
};

export type UserDailyResultRow = {
  publish_date_kst: string;
  succeeded: boolean;
};

export type StreakLeaderboardRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_success_count: number;
  last_success_publish_date_kst: string | null;
  profiles?: { nickname?: string | null } | Array<{ nickname?: string | null }> | null;
};

export type PuzzleFeedbackRow = {
  id: string;
  user_id: string;
  nickname_snapshot: string;
  reaction: PuzzleFeedbackReaction;
  comment: string;
  created_at: string;
};

export type GroupRow = {
  id: string;
  owner_user_id: string | null;
  publication_id: string;
  name: string | null;
  invite_code: string;
};

export type Actor = {
  userId: string | null;
  anonymousSessionId: string | null;
};
