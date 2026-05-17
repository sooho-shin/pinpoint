"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";
import { LeaderboardTabs } from "@/components/molecules/LeaderboardTabs";
import { RankingRow, type RankingRowData } from "@/components/molecules/RankingRow";
import { formatKoreanDate } from "@/lib/format";
import type { WinnerMessage } from "@/lib/puzzle/types";

type LeaderboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready" | "no_puzzle";
      publishDateKst: string;
      rows: RankingRowData[];
      canWriteWinnerMessage: boolean;
      winnerMessage: WinnerMessage | null;
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
  const [pending, setPending] = useState(false);

  async function load() {
    const [leaderboard, winnerMessage] = await Promise.all([
      getJson<Extract<LeaderboardState, { status: "ready" | "no_puzzle" }> & { winnerMessage?: WinnerMessage | null }>("/api/leaderboard/daily"),
      getJson<WinnerMessage | null>("/api/winner-message/current")
    ]);
    setState({ ...leaderboard, winnerMessage });
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
    </section>
  );
}
