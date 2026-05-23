"use client";

import { HelpCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { IconButton } from "@/components/atoms/IconButton";

export function GameGuideTooltip() {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        type="button"
        aria-controls={popoverId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? "게임 방법 닫기" : "게임 방법 보기"}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </IconButton>

      {open ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label="게임 방법"
          className="absolute right-0 top-12 z-20 w-[min(326px,calc(100vw-64px))] rounded-lg border border-[var(--border)] bg-white p-4 text-sm leading-6 text-[var(--text-secondary)] shadow-[0_16px_40px_rgba(32,33,36,0.16)]"
        >
          <div className="mb-2 text-sm font-bold text-[var(--text-primary)]">게임 방법</div>
          <p>하나의 정답을 향해 단서가 최대 5개까지 열립니다. 첫 단서로 시작하고, 틀리거나 다음 단서를 누르면 한 줄씩 더 볼 수 있어요.</p>
          <p className="mt-3">5번째 단서 안에 맞히면 성공입니다. 적은 단서와 짧은 시간으로 맞힐수록 랭킹에서 앞서갑니다.</p>
          <p className="mt-3">로그인하고 닉네임을 설정하면 기록을 랭킹에 올릴 수 있고, 오늘 1등은 100자 확성기 메시지를 남길 수 있습니다.</p>
          <p className="mt-3 text-xs font-semibold text-[var(--text-primary)]">문제와 1등 확성기는 매일 오후 5시에 새로 시작합니다.</p>
        </div>
      ) : null}
    </div>
  );
}
