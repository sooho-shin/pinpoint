"use client";

import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import type { WinnerMessage } from "@/lib/puzzle/types";

async function getWinnerMessage() {
  const response = await fetch("/api/winner-message/current");
  if (!response.ok) return null;
  return (await response.json()) as WinnerMessage | null;
}

export function DailyWinnerBanner() {
  const [message, setMessage] = useState<WinnerMessage | null>(null);

  useEffect(() => {
    let mounted = true;
    getWinnerMessage()
      .then((payload) => {
        if (mounted) setMessage(payload);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  if (!message) return null;

  return (
    <section className="mb-4 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-white shadow-[0_12px_30px_rgba(23,107,91,0.22)]">
      <div className="flex items-start gap-3">
        <Megaphone aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-semibold opacity-80">오늘의 1등 메시지</div>
          <p className="mt-1 break-words text-sm font-semibold leading-5">
            <span>{message.nickname}</span>
            <span className="mx-1 opacity-70">:</span>
            <span>{message.message}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
