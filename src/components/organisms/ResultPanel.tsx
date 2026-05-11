"use client";

import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/atoms/Button";
import { ClueRow } from "@/components/molecules/ClueRow";
import { ScoreBadge } from "@/components/molecules/ScoreBadge";
import { ShareActionGroup } from "@/components/molecules/ShareActionGroup";
import type { SubmitResult } from "@/lib/puzzle/types";

export function ResultPanel() {
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("pinpoint:last-result");
    if (!raw) return;
    setResult(JSON.parse(raw) as SubmitResult);
  }, []);

  const shareText = useMemo(() => {
    if (!result || !result.answer) return "";
    const mark = result.status === "succeeded" ? `${result.usedClueCount}/5` : "실패";
    return `Pinpoint ${mark}\n정답: ${result.answer}\n단서: ${result.clues.join(" / ")}`;
  }, [result]);

  async function copyShareText() {
    if (!shareText) return;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
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

      <ShareActionGroup onCopy={copyShareText} copied={copied} />
    </section>
  );
}
