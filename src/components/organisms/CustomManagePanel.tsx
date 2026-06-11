"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/Button";
import { LoadingSurface } from "@/components/molecules/LoadingSurface";

type ManageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "ready"; game: { slug: string; status: "active" | "hidden" | "deleted"; reportCount: number; createdAt: string } };

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

export function CustomManagePanel({ token }: { token: string }) {
  const [state, setState] = useState<ManageState>({ status: "loading" });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"hide" | "delete" | null>(null);

  async function load() {
    setState(await requestJson<ManageState>(`/api/custom-games/admin/${encodeURIComponent(token)}`));
  }

  useEffect(() => {
    load().catch((error: Error) => setState({ status: "error", message: error.message }));
  }, [token]);

  async function runAction(action: "hide" | "delete") {
    setPending(action);
    setMessage("");
    try {
      await requestJson(`/api/custom-games/admin/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      setMessage(action === "hide" ? "게임을 숨김 처리했습니다." : "게임을 삭제했습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리 작업을 처리하지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  if (state.status === "loading") return <LoadingSurface message="관리 정보를 불러오는 중입니다." />;
  if (state.status === "error") return <section className="surface min-h-[360px] p-6 text-sm text-[var(--danger)]">{state.message}</section>;
  if (state.status === "not_found") {
    return (
      <section className="surface min-h-[360px] p-6">
        <h2 className="text-xl font-bold">관리 링크가 올바르지 않습니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">링크를 다시 확인해 주세요.</p>
      </section>
    );
  }

  return (
    <section className="surface min-h-[420px] p-6">
      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">현재 상태 · {state.game.status}</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">공유 관리</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">생성된 문제의 정답과 단서는 수정할 수 없습니다.</p>
      </div>

      <div className="muted-surface mb-5 p-4">
        <div className="text-sm font-semibold">신고 수</div>
        <div className="mt-1 text-xl font-bold">{state.game.reportCount}</div>
      </div>

      <div className="space-y-3">
        <ButtonLink href={`/custom/${encodeURIComponent(state.game.slug)}`} variant="secondary">플레이 링크 열기</ButtonLink>
        <Button type="button" variant="secondary" disabled={pending !== null || state.game.status !== "active"} onClick={() => runAction("hide")}>숨김 처리</Button>
        <Button type="button" disabled={pending !== null || state.game.status === "deleted"} onClick={() => runAction("delete")}>삭제</Button>
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p> : null}
    </section>
  );
}
