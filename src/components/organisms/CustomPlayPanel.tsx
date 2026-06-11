"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";
import { ClueRow } from "@/components/molecules/ClueRow";
import { FeedbackMessage } from "@/components/molecules/FeedbackMessage";
import { GuessInputGroup } from "@/components/molecules/GuessInputGroup";
import { LoadingSurface } from "@/components/molecules/LoadingSurface";
import { ScoreBadge } from "@/components/molecules/ScoreBadge";

type CustomState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not_found" | "hidden" | "deleted" }
  | {
      status: "ready";
      game: { id: string; slug: string; status: string; createdAt: string };
      clues: string[];
      lockedCount: number;
      answer?: string;
      attempt: {
        id: string;
        status: "playing" | "succeeded" | "failed" | "abandoned";
        usedClueCount: number;
        elapsedMs: number | null;
        isCorrect: boolean;
        isRanked: boolean;
        nickname: string | null;
      } | null;
    };

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

export function CustomPlayPanel({ slug }: { slug: string }) {
  const [state, setState] = useState<CustomState>({ status: "loading" });
  const [guess, setGuess] = useState("");
  const [nickname, setNickname] = useState("");
  const [feedback, setFeedback] = useState("");
  const [recentWrongGuess, setRecentWrongGuess] = useState("");
  const [pendingAction, setPendingAction] = useState<"submit" | "reveal" | "rank" | "report" | null>(null);

  const basePath = `/api/custom-games/${encodeURIComponent(slug)}`;

  useEffect(() => {
    let mounted = true;
    requestJson<CustomState>(`${basePath}/start`, { method: "POST", body: "{}" })
      .then((payload) => {
        if (mounted) setState(payload);
      })
      .catch((error: Error) => {
        if (mounted) setState({ status: "error", message: error.message });
      });
    return () => {
      mounted = false;
    };
  }, [basePath]);

  const terminal = state.status === "ready" && (state.attempt?.status === "succeeded" || state.attempt?.status === "failed");
  const solved = state.status === "ready" && state.attempt?.status === "succeeded";
  const shareText = useMemo(() => {
    if (state.status !== "ready" || !state.answer || !terminal) return "";
    const mark = solved ? `${state.attempt?.usedClueCount ?? 5}/5` : "실패";
    return `Narrow Custom ${mark}\n정답: ${state.answer}\n${window.location.origin}/custom/${slug}`;
  }, [state, terminal, solved, slug]);

  async function reveal() {
    setPendingAction("reveal");
    setFeedback("");
    setRecentWrongGuess("");
    try {
      setState(await requestJson<CustomState>(`${basePath}/reveal`, { method: "POST", body: "{}" }));
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
      const payload = await requestJson<CustomState>(`${basePath}/submit`, {
        method: "POST",
        body: JSON.stringify({ guess: submittedGuess })
      });
      if (payload.status === "ready" && payload.attempt?.status === "playing") {
        setGuess("");
        setRecentWrongGuess(submittedGuess);
        setFeedback("아직 아니에요. 다음 단서를 열었습니다.");
      } else {
        setRecentWrongGuess("");
      }
      setState(payload);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "제출을 처리하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  async function registerRank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim()) return;
    setPendingAction("rank");
    setFeedback("");
    try {
      const payload = await requestJson<{ ok: boolean; rankStatus: string; nickname: string }>(`${basePath}/ranking`, {
        method: "POST",
        body: JSON.stringify({ nickname })
      });
      setFeedback(payload.rankStatus === "flagged" ? "기록이 검토 대기 상태로 저장됐습니다." : "랭킹에 등록했습니다.");
      setState(await requestJson<CustomState>(basePath));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "랭킹에 등록하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  async function copyResult() {
    const text = shareText || `${window.location.origin}/custom/${slug}`;
    await navigator.clipboard?.writeText(text);
    setFeedback("복사했습니다.");
  }

  async function report() {
    setPendingAction("report");
    setFeedback("");
    try {
      await requestJson(`${basePath}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "player_report" })
      });
      setFeedback("신고를 접수했습니다.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "신고를 처리하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  if (state.status === "loading") return <LoadingSurface message="공유 문제를 불러오는 중입니다." />;
  if (state.status === "error") return <section className="surface min-h-[360px] p-6 text-sm text-[var(--danger)]">{state.message}</section>;
  if (state.status === "not_found" || state.status === "deleted") {
    return (
      <section className="surface min-h-[360px] p-6">
        <h2 className="text-xl font-bold">문제를 찾을 수 없습니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">공유 링크가 잘못됐거나 삭제된 게임입니다.</p>
      </section>
    );
  }
  if (state.status === "hidden") {
    return (
      <section className="surface min-h-[360px] p-6">
        <h2 className="text-xl font-bold">숨김 처리된 게임입니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">제작자 또는 운영자에 의해 공개가 중단됐습니다.</p>
      </section>
    );
  }

  if (state.status !== "ready") {
    return <section className="surface min-h-[360px] p-6 text-sm text-[var(--danger)]">공유 문제를 표시하지 못했습니다.</section>;
  }

  return (
    <section className="surface min-h-[590px] p-6">
      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">커스텀 게임</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">{terminal ? solved ? "정답입니다" : "실패했어요" : "단서를 보고 맞혀보세요"}</h2>
        {terminal && state.attempt ? <div className="mt-3">{solved ? <ScoreBadge usedClueCount={state.attempt.usedClueCount} elapsedMs={state.attempt.elapsedMs} /> : <p className="text-sm text-[var(--text-secondary)]">정답은 {state.answer}입니다.</p>}</div> : null}
      </div>

      <div className="mb-6 rounded-md border border-[var(--border)] px-4">
        {state.clues.map((clue, index) => <ClueRow key={`${clue}-${index}`} index={index + 1} clue={clue} />)}
      </div>

      {terminal ? (
        <div className="space-y-4">
          <div className="muted-surface p-4">
            <div className="text-xs font-semibold text-[var(--text-secondary)]">정답</div>
            <div className="mt-1 text-xl font-bold">{state.answer}</div>
          </div>
          {solved && !state.attempt?.isRanked ? (
            <form className="muted-surface space-y-3 p-4" onSubmit={registerRank}>
              <div className="text-sm font-semibold">랭킹 등록</div>
              <TextInput value={nickname} maxLength={12} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임" disabled={pendingAction === "rank"} />
              <Button type="submit" disabled={pendingAction === "rank" || !nickname.trim()}>랭킹에 등록</Button>
            </form>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={copyResult}>결과 복사</Button>
            <ButtonLink href={`/custom/${encodeURIComponent(slug)}/ranking`}>랭킹 보기</ButtonLink>
          </div>
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
            pendingAction={pendingAction === "submit" || pendingAction === "reveal" ? pendingAction : null}
          />
          {recentWrongGuess ? (
            <div className="rounded-md border border-[var(--warning)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
              <span className="font-semibold">방금 입력한 오답</span>
              <span className="ml-2 break-all">{recentWrongGuess}</span>
            </div>
          ) : null}
        </div>
      )}

      {feedback ? <div className="mt-4"><FeedbackMessage tone="warning">{feedback}</FeedbackMessage></div> : null}
      <div className="mt-4">
        <Button type="button" variant="ghost" disabled={pendingAction === "report"} onClick={report}>신고하기</Button>
      </div>
    </section>
  );
}
