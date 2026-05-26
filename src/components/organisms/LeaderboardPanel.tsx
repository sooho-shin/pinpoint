"use client";

import { clsx } from "clsx";
import { FormEvent, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";
import { LeaderboardTabs } from "@/components/molecules/LeaderboardTabs";
import { RankingRow, type RankingRowData } from "@/components/molecules/RankingRow";
import { formatKoreanDate } from "@/lib/format";
import type { PuzzleFeedbackReaction, PuzzleFeedbackState, StreakLeaderboardState, WinnerMessage } from "@/lib/puzzle/types";

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
      myRank: RankingRowData | null;
      canWriteWinnerMessage: boolean;
      winnerMessage: WinnerMessage | null;
      puzzleFeedback: PuzzleFeedbackState;
      streakLeaderboard: StreakLeaderboardState;
      participation?: DailyRankingParticipation;
    };

type DailyRankingParticipation =
  | { status: "requires_sign_in" }
  | { status: "requires_nickname" }
  | { status: "not_completed" }
  | { status: "failed" }
  | { status: "ranked" }
  | { status: "succeeded_not_visible"; reason: "flagged" | "unknown" };

type GroupLeaderboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready" | "no_puzzle" | "missing_code" | "not_found" | "requires_sign_in" | "requires_nickname";
      publishDateKst: string;
      rows: RankingRowData[];
      group: { id: string; name: string; inviteCode: string } | null;
      message?: string;
      requiresSignIn?: boolean;
      requiresNickname?: boolean;
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

function getGroupUrl(inviteCode: string) {
  if (typeof window === "undefined") return `/ranking?group=${encodeURIComponent(inviteCode)}`;
  return `${window.location.origin}/ranking?group=${encodeURIComponent(inviteCode)}`;
}

function RankingParticipationPanel({ participation, myRank }: { participation?: DailyRankingParticipation; myRank: RankingRowData | null }) {
  if (!participation) return null;

  const content = (() => {
    switch (participation.status) {
      case "requires_sign_in":
        return {
          title: "내 기록 올리기",
          message: "로그인하면 성공 기록이 오늘의 랭킹에 표시됩니다.",
          action: <ButtonLink href="/signin?next=/ranking" variant="secondary">로그인하기</ButtonLink>
        };
      case "requires_nickname":
        return {
          title: "닉네임 설정",
          message: "닉네임을 설정하면 성공 기록이 오늘의 랭킹에 표시됩니다.",
          action: <ButtonLink href="/nickname?next=/ranking" variant="secondary">닉네임 설정</ButtonLink>
        };
      case "not_completed":
        return {
          title: "오늘 문제 진행 중",
          message: "오늘 문제를 완료하면 랭킹 참여 상태가 반영됩니다.",
          action: <ButtonLink href="/" variant="secondary">문제로 돌아가기</ButtonLink>
        };
      case "failed":
        return {
          title: "오늘은 랭킹 미등록",
          message: "오늘 문제를 맞히지 못해서 랭킹에는 등록되지 않았습니다."
        };
      case "ranked":
        return {
          title: "내 기록 등록 완료",
          message: myRank ? `현재 내 순위는 ${myRank.rank}위입니다.` : "내 성공 기록이 오늘의 랭킹에 등록되었습니다."
        };
      case "succeeded_not_visible":
        return {
          title: "기록 검토 중",
          message: participation.reason === "flagged"
            ? "매우 빠른 기록이라 검토 후 랭킹에 표시됩니다."
            : "성공 기록은 저장됐지만 현재 공개 랭킹에는 표시되지 않습니다."
        };
    }
  })();

  return (
    <div className="muted-surface p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{content.title}</div>
      <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{content.message}</p>
      {content.action ? <div className="mt-4">{content.action}</div> : null}
    </div>
  );
}

export function LeaderboardPanel({ groupCode, activeTab = "daily" }: { groupCode?: string; activeTab?: "daily" | "group" }) {
  const isGroupMode = activeTab === "group";
  const [state, setState] = useState<LeaderboardState>({ status: "loading" });
  const [groupState, setGroupState] = useState<GroupLeaderboardState>({ status: "loading" });
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackReaction, setFeedbackReaction] = useState<PuzzleFeedbackReaction>("good");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitMessage, setFeedbackSubmitMessage] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState(false);

  async function load() {
    if (isGroupMode) {
      const group = await getJson<GroupLeaderboardState>(`/api/leaderboard/group?code=${encodeURIComponent(groupCode ?? "")}`);
      setGroupState(group);
      return;
    }

    const [leaderboard, winnerMessage, puzzleFeedback, streakLeaderboard] = await Promise.all([
      getJson<Extract<LeaderboardState, { status: "ready" | "no_puzzle" }> & { winnerMessage?: WinnerMessage | null }>("/api/leaderboard/daily"),
      getJson<WinnerMessage | null>("/api/winner-message/current"),
      getJson<PuzzleFeedbackState>("/api/puzzle-feedback/daily"),
      getJson<StreakLeaderboardState>("/api/leaderboard/streak")
    ]);
    setState({ ...leaderboard, winnerMessage, puzzleFeedback, streakLeaderboard });
    if (puzzleFeedback.status === "ready" && puzzleFeedback.myFeedback) {
      setFeedbackReaction(puzzleFeedback.myFeedback.reaction);
      setFeedbackComment(puzzleFeedback.myFeedback.comment);
    }
  }

  useEffect(() => {
    load().catch((error: Error) => {
      if (isGroupMode) {
        setGroupState({ status: "error", message: error.message });
      } else {
        setState({ status: "error", message: error.message });
      }
    });
  }, [activeTab, groupCode]);

  async function copyGroupLink(inviteUrl?: string) {
    const url = inviteUrl ?? "";
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setGroupMessage("그룹 링크를 복사했습니다.");
  }

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

  if (isGroupMode) {
    if (groupState.status === "loading") {
      return <section className="surface min-h-[544px] p-6 text-sm text-[var(--text-secondary)]">그룹 랭킹을 불러오는 중입니다.</section>;
    }

    if (groupState.status === "error") {
      return <section className="surface min-h-[360px] p-6 text-sm text-[var(--danger)]">{groupState.message}</section>;
    }

    const inviteUrl = groupState.group ? getGroupUrl(groupState.group.inviteCode) : "";
    return (
      <section className="surface min-h-[544px] p-6">
        <div className="mb-5">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">{formatKoreanDate(groupState.publishDateKst)}</div>
          <h2 className="mt-1 text-[22px] font-bold leading-[30px]">{groupState.group?.name ?? "그룹 랭킹"}</h2>
        </div>

        <div className="mb-[22px]">
          <LeaderboardTabs active="group" groupHref={groupState.group ? `/ranking?group=${encodeURIComponent(groupState.group.inviteCode)}` : "/ranking?tab=group"} />
        </div>

        {groupState.status === "ready" ? (
          <>
            <div className="muted-surface p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">공유 그룹</div>
              <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">같은 공유 URL로 들어온 사람들끼리 오늘 기록을 비교합니다.</p>
              <div className="mt-3 truncate rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-secondary)]">{inviteUrl}</div>
              <div className="mt-4">
                <Button type="button" variant="secondary" onClick={() => copyGroupLink(inviteUrl)}>URL 복사</Button>
              </div>
              {groupMessage ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{groupMessage}</p> : null}
            </div>
            <div className="mt-6 space-y-1">
              {groupState.rows.length === 0 ? (
                <div className="muted-surface p-4 text-sm text-[var(--text-secondary)]">아직 이 그룹에 랭킹 기록이 없습니다.</div>
              ) : (
                groupState.rows.map((row) => <RankingRow key={row.id} row={row} />)
              )}
            </div>
          </>
        ) : groupState.status === "missing_code" ? (
          <div className="muted-surface p-4">
            <div className="text-sm font-semibold text-[var(--text-primary)]">공유 URL이 필요합니다</div>
            <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">메인 화면의 공유 버튼을 누르면 자동으로 그룹 URL이 복사됩니다. 그 URL로 들어온 사람들끼리 그룹 랭킹을 볼 수 있습니다.</p>
            <div className="mt-4">
              <ButtonLink href="/" variant="secondary">메인에서 공유하기</ButtonLink>
            </div>
          </div>
        ) : (
          <div className="muted-surface p-4">
            <p className="text-sm leading-5 text-[var(--text-secondary)]">{groupState.message ?? "그룹 랭킹에 참여할 수 없습니다."}</p>
            {groupState.requiresSignIn ? (
              <div className="mt-4">
                <ButtonLink href={`/signin?next=${encodeURIComponent(`/ranking?group=${groupCode ?? ""}`)}`} variant="secondary">로그인하기</ButtonLink>
              </div>
            ) : null}
            {groupState.requiresNickname ? (
              <div className="mt-4">
                <ButtonLink href={`/nickname?next=${encodeURIComponent(`/ranking?group=${groupCode ?? ""}`)}`} variant="secondary">닉네임 설정</ButtonLink>
              </div>
            ) : null}
          </div>
        )}
      </section>
    );
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
          <span className="ml-2 break-words text-[var(--text-secondary)] [overflow-wrap:anywhere]">{state.winnerMessage.message}</span>
        </div>
      ) : null}

      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">{formatKoreanDate(state.publishDateKst)}</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">오늘의 랭킹</h2>
      </div>

      <div className="mb-[22px]">
        <LeaderboardTabs active="daily" groupHref="/ranking?tab=group" />
      </div>

      <div className="mb-6 space-y-1">
        {state.rows.length === 0 ? (
          <div className="muted-surface p-4 text-sm text-[var(--text-secondary)]">아직 랭킹 기록이 없습니다.</div>
        ) : (
          state.rows.map((row) => <RankingRow key={row.id} row={row} />)
        )}
      </div>

      <div className="mb-6 border-t border-[var(--border)] pt-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">연승 랭킹</div>
            <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">매일 정답을 맞힌 연속 기록</p>
          </div>
          {state.streakLeaderboard.myRank ? (
            <div className="shrink-0 text-xs font-semibold text-[var(--accent)]">내 연승 {state.streakLeaderboard.myRank.currentStreak}일</div>
          ) : null}
        </div>
        <div className="space-y-2">
          {state.streakLeaderboard.rows.length === 0 ? (
            <div className="muted-surface p-4 text-sm text-[var(--text-secondary)]">아직 연승 기록이 없습니다.</div>
          ) : (
            state.streakLeaderboard.rows.slice(0, 5).map((row) => (
              <div key={row.id} className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {row.rank}. {row.nickname}{row.isMe ? " · 나" : ""}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">
                    최고 {row.longestStreak}일 · 누적 {row.totalSuccessCount}회
                  </div>
                </div>
                <div className="shrink-0 text-sm font-bold text-[var(--accent)]">{row.currentStreak}일</div>
              </div>
            ))
          )}
        </div>
      </div>

      {state.canWriteWinnerMessage ? (
        <form className="space-y-3" onSubmit={submitMessage}>
          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">1등 확성기</div>
            <p className="mb-3 text-sm leading-5 text-[var(--text-secondary)]">
              {state.winnerMessage ? "현재 1등 메시지로 갱신됩니다." : "메인 화면 최상단에 다음 공개 전까지 표시됩니다."}
            </p>
          </div>
          <TextInput
            value={message}
            maxLength={100}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="100자 이내 메시지"
            disabled={pending}
          />
          <div className="text-right text-xs font-semibold text-[var(--text-secondary)]">{message.length}/100</div>
          <Button type="submit" disabled={pending || !message.trim()}>{state.winnerMessage ? "메시지 갱신" : "메시지 등록"}</Button>
          {feedback ? <p className="text-sm text-[var(--text-secondary)]">{feedback}</p> : null}
        </form>
      ) : (
        <RankingParticipationPanel participation={state.participation} myRank={state.myRank} />
      )}

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
