"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";
import { ClueRow } from "@/components/molecules/ClueRow";
import { FeedbackToast } from "@/components/molecules/FeedbackMessage";
import { ScoreBadge } from "@/components/molecules/ScoreBadge";
import { ShareActionGroup } from "@/components/molecules/ShareActionGroup";
import type { DailyRankingParticipation, SubmitResult } from "@/lib/puzzle/types";

function RankingRegistrationPanel({
  participation,
  onRegistered
}: {
  participation?: DailyRankingParticipation;
  onRegistered: (participation: DailyRankingParticipation) => void;
}) {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submitNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim()) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/leaderboard/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "랭킹에 등록하지 못했습니다.");
      onRegistered(payload.participation);
      setNickname("");
      setMessage("랭킹에 등록했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "랭킹에 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (participation?.status === "requires_anonymous_nickname") {
    return (
      <div className="muted-surface mb-4 p-4">
        <div className="text-sm font-semibold text-[var(--text-primary)]">랭킹 등록</div>
        <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">닉네임을 입력하면 오늘의 랭킹에 최초 기록으로 등록됩니다.</p>
        <form className="mt-4 space-y-3" onSubmit={submitNickname}>
          <TextInput
            value={nickname}
            maxLength={12}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="닉네임"
            disabled={pending}
          />
          {message ? <p className="text-sm text-[var(--text-secondary)]">{message}</p> : null}
          <Button type="submit" disabled={pending || !nickname.trim()}>랭킹에 등록</Button>
        </form>
      </div>
    );
  }

  const content = (() => {
    switch (participation?.status) {
      case "requires_sign_in":
        return {
          title: "랭킹 등록",
          message: "로그인하면 오늘의 성공 기록을 랭킹에 올릴 수 있습니다.",
          action: <ButtonLink href="/signin?next=/ranking">랭킹 등록하기</ButtonLink>
        };
      case "requires_nickname":
        return {
          title: "닉네임 설정",
          message: "닉네임을 설정하면 오늘의 성공 기록이 랭킹에 표시됩니다.",
          action: <ButtonLink href="/nickname?next=/ranking">닉네임 설정하기</ButtonLink>
        };
      case "succeeded_not_visible":
        return {
          title: "기록 검토 중",
          message: participation.reason === "flagged"
            ? "매우 빠른 기록이라 검토 후 랭킹에 표시됩니다."
            : "성공 기록은 저장됐지만 현재 공개 랭킹에는 표시되지 않습니다."
        };
      case "not_completed":
      case "failed":
      case "ranked":
        return null;
      default:
        return {
          title: "랭킹 등록",
          message: "Google 로그인과 닉네임 설정을 마치면 오늘의 랭킹에 기록할 수 있습니다.",
          action: <ButtonLink href="/signin?next=/ranking">랭킹 등록하기</ButtonLink>
        };
    }
  })();

  if (!content) return null;

  return (
    <div className="muted-surface mb-4 p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{content.title}</div>
      <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{content.message}</p>
      {content.action ? <div className="mt-4">{content.action}</div> : null}
    </div>
  );
}

export function ResultPanel() {
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [winnerPromptOpen, setWinnerPromptOpen] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState("");
  const [winnerFeedback, setWinnerFeedback] = useState("");
  const [winnerPending, setWinnerPending] = useState(false);

  useEffect(() => {
    if (!winnerFeedback) return;
    const timeout = window.setTimeout(() => setWinnerFeedback(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [winnerFeedback]);

  useEffect(() => {
    let mounted = true;
    const raw = sessionStorage.getItem("pinpoint:last-result");
    if (!raw) return;
    let cached: SubmitResult;
    try {
      cached = JSON.parse(raw) as SubmitResult;
    } catch {
      sessionStorage.removeItem("pinpoint:last-result");
      return;
    }
    setResult(cached);
    const promptKey = `pinpoint:winner-message-prompted:${cached.attemptId ?? cached.publicationId}`;
    if (cached.canWriteWinnerMessage && !sessionStorage.getItem(promptKey)) {
      setWinnerPromptOpen(true);
      sessionStorage.setItem(promptKey, "1");
    }

    fetch("/api/today")
      .then((response) => response.json())
      .then((payload) => {
        if (!mounted || payload.status !== "ready") return;
        const samePublication = payload.publicationId === cached.publicationId;
        const completed = payload.attempt?.status === "succeeded" || payload.attempt?.status === "failed";
        if (!samePublication || !completed) {
          sessionStorage.removeItem("pinpoint:last-result");
          setResult(null);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const shareText = useMemo(() => {
    if (!result || !result.answer) return "";
    const mark = result.status === "succeeded" ? `${result.usedClueCount}/5` : "실패";
    return `Narrow ${mark}\n정답: ${result.answer}\n단서: ${result.clues.join(" / ")}`;
  }, [result]);

  async function shareResult() {
    if (!shareText) return;
    const url = window.location.origin;
    const text = `${shareText}\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Narrow", text, url });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
    } catch {
      // 공유창 취소는 사용자가 의도한 흐름이므로 조용히 무시한다.
    }
  }

  async function submitWinnerMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!winnerMessage.trim()) return;
    setWinnerPending(true);
    setWinnerFeedback("");
    try {
      const response = await fetch("/api/winner-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: winnerMessage })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "메시지를 등록하지 못했습니다.");
      setWinnerMessage("");
      setWinnerPromptOpen(false);
      setResult((current) => current ? { ...current, canWriteWinnerMessage: false } : current);
      window.location.reload();
    } catch (error) {
      setWinnerFeedback(error instanceof Error ? error.message : "메시지를 등록하지 못했습니다.");
    } finally {
      setWinnerPending(false);
    }
  }

  if (!result) {
    return (
      <section className="surface min-h-[360px] p-6">
        <h2 className="text-xl font-bold">결과가 없습니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">오늘 문제를 먼저 풀어주세요.</p>
        <div className="mt-6">
          <ButtonLink href="/">문제로 돌아가기</ButtonLink>
        </div>
      </section>
    );
  }

  const solved = result.status === "succeeded";
  const shouldShowRankingPanel = solved && (!result.isRanked || result.participation?.status === "succeeded_not_visible");

  return (
    <section className="surface min-h-[590px] p-6">
      <div className="mb-6">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">{result.category}</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">{solved ? "정답입니다" : "오늘은 실패했어요"}</h2>
        <div className="mt-3">{solved ? <ScoreBadge usedClueCount={result.usedClueCount} elapsedMs={result.elapsedMs} /> : <p className="text-sm text-[var(--text-secondary)]">정답은 {result.answer}입니다.</p>}</div>
      </div>

      <div className="mb-6 rounded-md border border-[var(--border)] px-4">
        {result.clues.map((clue, index) => (
          <ClueRow key={`${clue}-${index}`} index={index + 1} clue={clue} />
        ))}
      </div>

      <div className="muted-surface mb-6 p-4">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">정답</div>
        <div className="mt-1 text-xl font-bold">{result.answer}</div>
      </div>

      {shouldShowRankingPanel ? (
        <RankingRegistrationPanel
          participation={result.participation}
          onRegistered={(participation) => {
            const next = { ...result, isRanked: participation.status === "ranked", participation };
            setResult(next);
            sessionStorage.setItem("pinpoint:last-result", JSON.stringify(next));
          }}
        />
      ) : null}

      <ShareActionGroup onCopy={shareResult} copied={copied} />

      {winnerPromptOpen && result.canWriteWinnerMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,33,36,0.42)] p-6">
          <div className="w-full max-w-[342px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_48px_rgba(32,33,36,0.22)]">
            <div className="text-xs font-semibold text-[var(--accent)]">오늘의 1등</div>
            <h3 className="mt-1 text-xl font-bold">확성기 메시지</h3>
            <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">메인 화면 최상단에 다음 공개 전까지 표시됩니다.</p>
            <form className="mt-4 space-y-3" onSubmit={submitWinnerMessage}>
              <TextInput
                value={winnerMessage}
                maxLength={100}
                onChange={(event) => setWinnerMessage(event.target.value)}
                placeholder="100자 이내 메시지"
                disabled={winnerPending}
                autoFocus
              />
              <div className="text-right text-xs font-semibold text-[var(--text-secondary)]">{winnerMessage.length}/100</div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" disabled={winnerPending} onClick={() => setWinnerPromptOpen(false)}>나중에</Button>
                <Button type="submit" disabled={winnerPending || !winnerMessage.trim()}>등록</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {winnerFeedback ? <FeedbackToast>{winnerFeedback}</FeedbackToast> : null}
    </section>
  );
}
