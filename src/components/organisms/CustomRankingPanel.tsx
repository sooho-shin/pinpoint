"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/atoms/Button";
import { LoadingSurface } from "@/components/molecules/LoadingSurface";
import { RankingRow, type RankingRowData } from "@/components/molecules/RankingRow";

type RankingState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: RankingRowData[]; myRank: RankingRowData | null; game: { slug: string } }
  | { status: "not_found" | "hidden" | "deleted"; rows: [] };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  return payload as T;
}

export function CustomRankingPanel({ slug }: { slug: string }) {
  const [state, setState] = useState<RankingState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    getJson<RankingState>(`/api/custom-games/${encodeURIComponent(slug)}/ranking`)
      .then((payload) => {
        if (mounted) setState(payload);
      })
      .catch((error: Error) => {
        if (mounted) setState({ status: "error", message: error.message });
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (state.status === "loading") return <LoadingSurface message="랭킹을 불러오는 중입니다." minHeightClass="min-h-[544px]" />;
  if (state.status === "error") return <section className="surface min-h-[360px] p-6 text-sm text-[var(--danger)]">{state.message}</section>;
  if (state.status !== "ready") {
    return (
      <section className="surface min-h-[360px] p-6">
        <h2 className="text-xl font-bold">랭킹을 볼 수 없습니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">삭제되었거나 숨김 처리된 게임입니다.</p>
      </section>
    );
  }

  return (
    <section className="surface min-h-[544px] p-6">
      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">공유 문제</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">랭킹</h2>
      </div>
      {state.myRank ? (
        <div className="muted-surface mb-5 p-4 text-sm">
          내 기록은 현재 {state.myRank.rank}위입니다.
        </div>
      ) : null}
      <div className="space-y-1">
        {state.rows.length === 0 ? (
          <div className="muted-surface p-4 text-sm text-[var(--text-secondary)]">아직 랭킹 기록이 없습니다.</div>
        ) : (
          state.rows.map((row) => <RankingRow key={row.id} row={row} />)
        )}
      </div>
      <div className="mt-6">
        <ButtonLink href={`/custom/${encodeURIComponent(slug)}`} variant="secondary">문제로 돌아가기</ButtonLink>
      </div>
    </section>
  );
}
