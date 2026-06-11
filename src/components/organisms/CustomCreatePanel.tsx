"use client";

import { FormEvent, useState } from "react";
import { Button, ButtonLink } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";

type CreatedGame = {
  playPath: string;
  adminPath: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  return payload as T;
}

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function CustomCreatePanel() {
  const [answer, setAnswer] = useState("");
  const [clues, setClues] = useState(["", "", "", "", ""]);
  const [created, setCreated] = useState<CreatedGame | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function updateClue(index: number, value: string) {
    setClues((current) => current.map((clue, clueIndex) => clueIndex === index ? value : clue));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const payload = await postJson<CreatedGame>("/api/custom-games", { answer, clues });
      setCreated(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "커스텀 게임을 만들지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function copy(path: string) {
    await navigator.clipboard?.writeText(absoluteUrl(path));
    setMessage("링크를 복사했습니다.");
  }

  if (created) {
    return (
      <section className="surface min-h-[590px] p-6">
        <div className="mb-5">
          <div className="text-xs font-semibold text-[var(--accent)]">생성 완료</div>
          <h2 className="mt-1 text-[22px] font-bold leading-[30px]">공유할 준비가 됐습니다</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">플레이 링크는 친구에게 보내고, 관리 링크는 본인만 보관하세요.</p>
        </div>
        <div className="space-y-4">
          <div className="muted-surface p-4">
            <div className="text-sm font-semibold">플레이 링크</div>
            <div className="mt-2 break-all rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-secondary)]">{absoluteUrl(created.playPath)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => copy(created.playPath)}>복사</Button>
              <ButtonLink href={created.playPath}>열기</ButtonLink>
            </div>
          </div>
          <div className="muted-surface p-4">
            <div className="text-sm font-semibold">관리 링크</div>
            <div className="mt-2 break-all rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-secondary)]">{absoluteUrl(created.adminPath)}</div>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => copy(created.adminPath)}>관리 링크 복사</Button>
            </div>
          </div>
          {message ? <p className="text-sm text-[var(--text-secondary)]">{message}</p> : null}
          <Button type="button" variant="ghost" onClick={() => {
            setCreated(null);
            setAnswer("");
            setClues(["", "", "", "", ""]);
          }}>새 문제 만들기</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="surface min-h-[590px] p-6">
      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">정답 1개 · 단서 5개</div>
        <h2 className="mt-1 text-[22px] font-bold leading-[30px]">커스텀 게임</h2>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">정답</span>
          <TextInput value={answer} maxLength={40} onChange={(event) => setAnswer(event.target.value)} placeholder="예: 무지개" disabled={pending} />
        </label>
        <div className="space-y-3">
          {clues.map((clue, index) => (
            <label key={index} className="block">
              <span className="mb-2 block text-sm font-semibold">단서 {index + 1}</span>
              <TextInput value={clue} maxLength={30} onChange={(event) => updateClue(index, event.target.value)} disabled={pending} />
            </label>
          ))}
        </div>
        {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
        <Button type="submit" disabled={pending}>공유 링크 만들기</Button>
      </form>
    </section>
  );
}
