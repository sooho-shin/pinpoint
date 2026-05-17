"use client";

import { clsx } from "clsx";
import { FormEvent, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";
import { LeaderboardTabs } from "@/components/molecules/LeaderboardTabs";
import { RankingRow, type RankingRowData } from "@/components/molecules/RankingRow";
import { formatKoreanDate } from "@/lib/format";
import type { PuzzleFeedbackReaction, PuzzleFeedbackState, WinnerMessage } from "@/lib/puzzle/types";

const feedbackReactions: Array<{ value: PuzzleFeedbackReaction; label: string }> = [
  { value: "good", label: "좋았어요" },
  { value: "fun", label: "재밌어요" },
  { value: "tricky", label: "헷갈려요" },
  { value: "hard", label: "어려워요" },
  { value: "easy", label: "쉬웠어요" }
];

type LeaderboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready" | "no_puzzle";
      publishDateKst: string;
      rows: RankingRowData[];
      canWriteWinnerMessage: boolean;
      winnerMessage: WinnerMessage | null;
      puzzleFeedback: PuzzleFeedbackState;
    };

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  return payload as T;
}

export function LeaderboardPanel() {
  const [state, setState] = useState<LeaderboardState>({ status: "loading" });
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackReaction, setFeedbackReaction] = useState<PuzzleFeedbackReaction>("good");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitMessage, setFeedbackSubmitMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState(false);

  async function load() {
    const [leaderboard, winnerMessage, puzzleFeedback] = await Promise.all([
      getJson<Extract<LeaderboardState, { status: "ready" | "no_puzzle" }> & { winnerMessage?: WinnerMessage | null }>("/api/leaderboard/daily"),
      getJson<WinnerMessage | null>("/api/winner-message/current"),
      getJson<PuzzleFeedbackState>("/api/puzzle-feedback/daily")
    ]);
    setState({ ...leaderboard, winnerMessage, puzzleFeedback });
    if (puzzleFeedback.status === "ready" && puzzleFeedback.myFeedback) {
      setFeedbackReaction(puzzleFeedback.myFeedback.reaction);
      setFeedbackComment(puzzleFeedback.myFeedback.comment);
    }
  }

  useEffect(() => {
    load().catch((error: Error) => setState({ status: "error", message: error.message }));
  }, []);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setPending(true);
    setFeedback("");
    try {
      await getJson("/api/winner-message", {
        method: "POST",
        body: JSON.stringify({ message })
      });
      setMessage("");
      setFeedback("메시지를 등록했습니다.");
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "메시지를 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function submitPuzzleFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!feedbackComment.trim()) return;
    setFeedbackPending(true);
    setFeedbackSubmitMessage("");
    try {
      await getJson("/api/puzzle-feedback", {
        method: "POST",
        body: JSON.stringify({
          reaction: feedbackReaction,
          comment: feedbackComment
        })
      });
      setFeedbackSubmitMessage("평가를 저장했습니다.");
      await load();
    } catch (error) {
      setFeedbackSubmitMessage(error instanceof Error ? error.message : "평가를 저장하지 못했습니다.");
    } finally {
      setFeedbackPending(false);
    }
  }

  if (state.status === "loading") {
    return <section className="surface min-h-[544px] p-6 text-sm text-[var(--text-secondary)]">랭킹을 불러오는 중입니다.</section>;
  }

  if (state.status === "error") {
    return <section className="surface min-h-[360px] p-6 text-sm text-[var(--danger)]">{state.message}</section>;
  }

  if (state.status === "no_puzzle") {
    return (
      <section className="surface min-h-[360px] p-6">
        <h2 className="text-xl font-bold">랭킹이 없습니다</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{formatKoreanDate(state.publishDateKst)} 공개 문제가 아직 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="surface min-h-[544px] p-6">
      {state.winnerMessage ? (
        <div className="mb-5 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
          <span className="font-semibold">{state.winnerMessage.nickname}</span>
          <span className="ml-2 text-[var(--text-secondary)]">{state.winnerMessage.message}</span>
        </div>
      ) : null}

      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">{formatKoreanDate(state.publishDateKst)}</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">오늘의 랭킹</h2>
      </div>

      <div className="mb-[22px]">
        <LeaderboardTabs active="daily" />
      </div>

      <div className="mb-6 space-y-1">
        {state.rows.length === 0 ? (
          <div className="muted-surface p-4 text-sm text-[var(--text-secondary)]">아직 랭킹 기록이 없습니다.</div>
        ) : (
          state.rows.map((row) => <RankingRow key={row.id} row={row} />)
        )}
      </div>

      {state.canWriteWinnerMessage && !state.winnerMessage ? (
        <form className="space-y-3" onSubmit={submitMessage}>
          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">1등 확성기</div>
            <p className="mb-3 text-sm leading-5 text-[var(--text-secondary)]">메인 화면 최상단에 다음 공개 전까지 표시됩니다.</p>
          </div>
          <TextInput
            value={message}
            maxLength={100}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="100자 이내 메시지"
            disabled={pending}
          />
          <div className="text-right text-xs font-semibold text-[var(--text-secondary)]">{message.length}/100</div>
          <Button type="submit" disabled={pending || !message.trim()}>메시지 등록</Button>
          {feedback ? <p className="text-sm text-[var(--text-secondary)]">{feedback}</p> : null}
        </form>
      ) : !state.winnerMessage ? (
        <div className="muted-surface p-4">
          <div className="text-sm font-semibold text-[var(--text-primary)]">내 기록 올리기</div>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">로그인 후 닉네임을 연결하면 성공 기록이 오늘의 랭킹에 표시됩니다.</p>
          <div className="mt-4">
            <ButtonLink href="/signin?next=/ranking" variant="secondary">로그인하기</ButtonLink>
          </div>
        </div>
      ) : null}

      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <div className="text-sm font-semibold text-[var(--text-primary)]">오늘 문제 한마디</div>
        {state.puzzleFeedback.status === "ready" && state.puzzleFeedback.canRead ? (
          <>
            <form className="mt-3 space-y-3" onSubmit={submitPuzzleFeedback}>
              <div className="grid grid-cols-2 gap-2">
                {feedbackReactions.map((reaction) => (
                  <button
                    key={reaction.value}
                    type="button"
                    className={clsx(
                      "focus-ring min-h-10 rounded-md border px-3 text-sm font-semibold transition",
                      feedbackReaction === reaction.value
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-white text-[var(--text-primary)]"
                    )}
                    onClick={() => setFeedbackReaction(reaction.value)}
                    disabled={feedbackPending}
                  >
                    {reaction.label}
                  </button>
                ))}
              </div>
              <TextInput
                value={feedbackComment}
                maxLength={140}
                onChange={(event) => setFeedbackComment(event.target.value)}
                placeholder="오늘 문제 어땠나요?"
                disabled={feedbackPending}
              />
              <div className="text-right text-xs font-semibold text-[var(--text-secondary)]">{feedbackComment.length}/140</div>
              <Button type="submit" disabled={feedbackPending || !feedbackComment.trim()}>
                {state.puzzleFeedback.myFeedback ? "평가 수정" : "평가 등록"}
              </Button>
              {feedbackSubmitMessage ? <p className="text-sm text-[var(--text-secondary)]">{feedbackSubmitMessage}</p> : null}
            </form>

            <div className="mt-5 space-y-2">
              {state.puzzleFeedback.items.length === 0 ? (
                <div className="muted-surface p-4 text-sm text-[var(--text-secondary)]">아직 남겨진 한마디가 없습니다.</div>
              ) : (
                state.puzzleFeedback.items.map((item) => {
                  const reaction = feedbackReactions.find((entry) => entry.value === item.reaction)?.label ?? item.reaction;
                  return (
                    <div key={item.id} className="rounded-md border border-[var(--border)] bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 text-sm font-semibold text-[var(--text-primary)]">
                          {item.nickname}{item.isMe ? " · 나" : ""}
                        </div>
                        <div className="shrink-0 text-xs font-semibold text-[var(--accent)]">{reaction}</div>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{item.comment}</p>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="muted-surface mt-3 p-4">
            <p className="text-sm leading-5 text-[var(--text-secondary)]">
              {state.puzzleFeedback.status === "ready" ? state.puzzleFeedback.message : "오늘 공개된 문제가 없습니다."}
            </p>
            {state.puzzleFeedback.status === "ready" && state.puzzleFeedback.requiresSignIn ? (
              <div className="mt-4">
                <ButtonLink href="/signin?next=/ranking" variant="secondary">로그인하기</ButtonLink>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
