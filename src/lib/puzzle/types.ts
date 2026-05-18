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
  answer?: string;
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

export type PuzzleFeedbackReaction = "easy" | "good" | "hard" | "tricky" | "fun";

export type PuzzleFeedbackItem = {
  id: string;
  nickname: string;
  reaction: PuzzleFeedbackReaction;
  comment: string;
  createdAt: string;
  isMe: boolean;
};

export type PuzzleFeedbackState =
  | {
      status: "no_puzzle";
      publishDateKst: string;
      canRead: false;
      canWrite: false;
      items: [];
      myFeedback: null;
      message: string;
    }
  | {
      status: "ready";
      publishDateKst: string;
      canRead: boolean;
      canWrite: boolean;
      items: PuzzleFeedbackItem[];
      myFeedback: PuzzleFeedbackItem | null;
      message?: string;
      requiresSignIn?: boolean;
    };

export type StreakLeaderboardRow = {
  id: string;
  rank: number;
  nickname: string;
  currentStreak: number;
  longestStreak: number;
  totalSuccessCount: number;
  lastSuccessPublishDateKst: string | null;
  isMe: boolean;
};

export type StreakLeaderboardState = {
  status: "ready";
  rows: StreakLeaderboardRow[];
  myRank: StreakLeaderboardRow | null;
};

export type SubmitResult = {
  status: "playing" | "succeeded" | "failed";
  isCorrect: boolean;
  attemptId?: string;
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
