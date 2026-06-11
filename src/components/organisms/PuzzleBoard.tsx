"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { ClueRow } from "@/components/molecules/ClueRow";
import { FeedbackMessage } from "@/components/molecules/FeedbackMessage";
import { GuessInputGroup } from "@/components/molecules/GuessInputGroup";
import { LoadingSurface } from "@/components/molecules/LoadingSurface";
import { formatKoreanDate } from "@/lib/format";
import type { NoPuzzleState, PuzzlePlayState, SubmitResult } from "@/lib/puzzle/types";

type BoardState = PuzzlePlayState | NoPuzzleState | { status: "loading" } | { status: "error"; message: string };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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

export function PuzzleBoard({ groupCode }: { groupCode?: string }) {
  const router = useRouter();
  const [state, setState] = useState<BoardState>({ status: "loading" });
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const [recentWrongGuess, setRecentWrongGuess] = useState("");
  const [pendingAction, setPendingAction] = useState<"submit" | "reveal" | null>(null);

  useEffect(() => {
    let mounted = true;
    if (groupCode) sessionStorage.setItem("narrow:active-group", groupCode);
    requestJson<PuzzlePlayState | NoPuzzleState>("/api/today")
      .then((payload) => {
        if (mounted) setState(payload);
      })
      .catch((error: Error) => {
        if (mounted) setState({ status: "error", message: error.message });
      });
    return () => {
      mounted = false;
    };
  }, [groupCode]);

  useEffect(() => {
    if (!groupCode) return;
    requestJson("/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: groupCode })
    }).catch(() => undefined);
  }, [groupCode]);

  async function reveal() {
    setPendingAction("reveal");
    setFeedback("");
    setRecentWrongGuess("");
    try {
      const payload = await requestJson<PuzzlePlayState | NoPuzzleState>("/api/attempts/reveal", { method: "POST", body: "{}" });
      setState(payload);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "단서를 열지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedGuess = guess.trim();
    if (!submittedGuess) return;
    setPendingAction("submit");
    setFeedback("");
    try {
      const payload = await requestJson<SubmitResult | NoPuzzleState>("/api/attempts/submit", {
        method: "POST",
        body: JSON.stringify({ guess: submittedGuess })
      });
      if (payload.status === "no_puzzle") {
        setState(payload);
        return;
      }
      if (payload.status === "playing") {
        setGuess("");
        setRecentWrongGuess(submittedGuess);
        setFeedback("아직 아니에요. 다음 단서를 열었습니다.");
        setState({
          status: "ready",
          publicationId: payload.publicationId,
          publishDateKst: state.status === "ready" ? state.publishDateKst : "",
          category: payload.category,
          difficulty: payload.difficulty,
          clues: payload.clues,
          lockedCount: payload.lockedCount,
          attempt: null,
          winnerMessage: state.status === "ready" ? state.winnerMessage : null,
          requiresSignInForRanking: state.status === "ready" ? state.requiresSignInForRanking : false
        });
        return;
      }
      setRecentWrongGuess("");
      sessionStorage.setItem("pinpoint:last-result", JSON.stringify(payload));
      router.push("/result");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "제출을 처리하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  if (state.status === "loading") {
    return <LoadingSurface message="오늘 문제를 불러오는 중입니다." />;
  }

  if (state.status === "error") {
    return <div className="surface min-h-[360px] p-6 text-sm text-[var(--danger)]">{state.message}</div>;
  }

  if (state.status === "no_puzzle") {
    return (
      <div className="surface min-h-[360px] p-6">
        <h2 className="text-xl font-bold">오늘 공개된 문제가 없습니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{formatKoreanDate(state.publishDateKst)} 공개분이 아직 준비되지 않았습니다.</p>
      </div>
    );
  }

  const completed = state.attempt?.status === "succeeded" || state.attempt?.status === "failed";

  return (
    <section className="surface min-h-[590px] p-6">
      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">{formatKoreanDate(state.publishDateKst)}</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">{state.category}</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">문제와 1등 확성기는 매일 오후 5시에 새로 시작합니다.</p>
      </div>

      <div className="mb-6 rounded-md border border-[var(--border)] px-4">
        {state.clues.map((clue, index) => (
          <ClueRow key={`${clue}-${index}`} index={index + 1} clue={clue} />
        ))}
      </div>

      {completed ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">이미 오늘 문제를 완료했습니다.</p>
          {state.answer ? (
            <div className="muted-surface p-4">
              <div className="text-xs font-semibold text-[var(--text-secondary)]">정답</div>
              <div className="mt-1 text-xl font-bold">{state.answer}</div>
            </div>
          ) : null}
          <Button type="button" onClick={() => router.push(groupCode ? `/ranking?group=${encodeURIComponent(groupCode)}` : "/ranking")}>오늘의 랭킹 보기</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <GuessInputGroup
            value={guess}
            onChange={setGuess}
            onSubmit={submit}
            onReveal={reveal}
            disabled={pendingAction !== null}
            canReveal={state.lockedCount > 0}
            pendingAction={pendingAction}
          />
          {recentWrongGuess ? (
            <div className="rounded-md border border-[var(--warning)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
              <span className="font-semibold">방금 입력한 오답</span>
              <span className="ml-2 break-all">{recentWrongGuess}</span>
            </div>
          ) : null}
          {feedback ? <FeedbackMessage tone="warning">{feedback}</FeedbackMessage> : null}
        </div>
      )}
    </section>
  );
}
