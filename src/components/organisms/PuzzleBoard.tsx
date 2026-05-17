"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { ClueRow } from "@/components/molecules/ClueRow";
import { FeedbackMessage } from "@/components/molecules/FeedbackMessage";
import { GuessInputGroup } from "@/components/molecules/GuessInputGroup";
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

export function PuzzleBoard() {
  const router = useRouter();
  const [state, setState] = useState<BoardState>({ status: "loading" });
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    requestJson<PuzzlePlayState | NoPuzzleState>("/api/attempts/start", { method: "POST", body: "{}" })
      .then((payload) => {
        if (mounted) setState(payload);
      })
      .catch((error: Error) => {
        if (mounted) setState({ status: "error", message: error.message });
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function reveal() {
    setPending(true);
    setFeedback("");
    try {
      const payload = await requestJson<PuzzlePlayState | NoPuzzleState>("/api/attempts/reveal", { method: "POST", body: "{}" });
      setState(payload);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "단서를 열지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guess.trim()) return;
    if (state.status === "ready" && state.requiresSignInForRanking) {
      const promptKey = `pinpoint:anonymous-ranking-confirmed:${state.publicationId}`;
      if (!sessionStorage.getItem(promptKey)) {
        const shouldContinue = window.confirm(
          "비로그인 상태에서는 오늘의 랭킹 등록과 1등 확성기 메시지를 사용할 수 없습니다.\n\n정답 후 기록을 올리려면 로그인과 닉네임 설정이 필요합니다. 그대로 비로그인으로 진행할까요?"
        );
        if (!shouldContinue) {
          return;
        }
        sessionStorage.setItem(promptKey, "1");
      }
    }
    setPending(true);
    setFeedback("");
    try {
      const payload = await requestJson<SubmitResult | NoPuzzleState>("/api/attempts/submit", {
        method: "POST",
        body: JSON.stringify({ guess })
      });
      if (payload.status === "no_puzzle") {
        setState(payload);
        return;
      }
      if (payload.status === "playing") {
        setGuess("");
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
          requiresSignInForRanking: state.status === "ready" ? state.requiresSignInForRanking : true
        });
        return;
      }
      sessionStorage.setItem("pinpoint:last-result", JSON.stringify(payload));
      router.push("/result");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "제출을 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (state.status === "loading") {
    return <div className="surface min-h-[590px] p-6 text-sm text-[var(--text-secondary)]">오늘 문제를 불러오는 중입니다.</div>;
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
      </div>

      <div className="mb-6 rounded-md border border-[var(--border)] px-4">
        {state.clues.map((clue, index) => (
          <ClueRow key={`${clue}-${index}`} index={index + 1} clue={clue} />
        ))}
      </div>

      {completed ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">이미 오늘 문제를 완료했습니다.</p>
          <Button type="button" onClick={() => router.push("/ranking")}>오늘의 랭킹 보기</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <GuessInputGroup
            value={guess}
            onChange={setGuess}
            onSubmit={submit}
            onReveal={reveal}
            disabled={pending}
            canReveal={state.lockedCount > 0}
          />
          {feedback ? <FeedbackMessage tone="warning">{feedback}</FeedbackMessage> : null}
        </div>
      )}
    </section>
  );
}
