"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton() {
  const [shared, setShared] = useState(false);

  async function share() {
    const url = window.location.origin;
    const title = "Pinpoint";
    const text = "매일 오후 5시, 단서로 맞히는 한국어 연상 퍼즐";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShared(true);
      window.setTimeout(() => setShared(false), 1600);
    } catch {
      // 공유창 취소는 사용자가 의도한 흐름이므로 조용히 무시한다.
    }
  }

  const Icon = shared ? Check : Share2;

  return (
    <button
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white"
      type="button"
      onClick={share}
      aria-label={shared ? "링크가 복사되었습니다" : "Pinpoint 공유하기"}
      title={shared ? "복사됨" : "공유하기"}
    >
      <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
    </button>
  );
}
