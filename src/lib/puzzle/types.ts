export type AttemptStatus = "playing" | "succeeded" | "failed" | "abandoned";

export type PublicAttempt = {
  id: string;
  status: AttemptStatus;
  usedClueCount: number;
  elapsedMs: number | null;
  isCorrect: boolean;
  isRanked: boolean;
};

export type PuzzlePlayState = {
  status: "ready";
  publicationId: string;
  publishDateKst: string;
  category: string;
  difficulty: number;
  clues: string[];
  lockedCount: number;
  attempt: PublicAttempt | null;
  winnerMessage: WinnerMessage | null;
  requiresSignInForRanking: boolean;
};

export type NoPuzzleState = {
  status: "no_puzzle";
  publishDateKst: string;
};

export type WinnerMessage = {
  nickname: string;
  message: string;
  visibleUntil: string;
};

export type SubmitResult = {
  status: "playing" | "succeeded" | "failed";
  isCorrect: boolean;
  publicationId: string;
  category: string;
  difficulty: number;
  clues: string[];
  lockedCount: number;
  usedClueCount: number;
  elapsedMs: number | null;
  answer?: string;
  isRanked?: boolean;
  rankStatus?: "visible" | "flagged" | "hidden";
  canWriteWinnerMessage?: boolean;
};
