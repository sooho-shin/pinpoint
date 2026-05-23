"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

async function createShareUrl() {
  const currentGroup = new URLSearchParams(window.location.search).get("group");
  if (currentGroup) {
    return `${window.location.origin}/?group=${encodeURIComponent(currentGroup)}`;
  }

  const response = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error ?? "공유 링크를 만들지 못했습니다.");
  const inviteCode = String(payload.group.inviteCode);
  return `${window.location.origin}/?group=${encodeURIComponent(inviteCode)}`;
}

export function ShareButton() {
  const [shared, setShared] = useState(false);

  async function share() {
    try {
      const url = await createShareUrl();
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1600);
    } catch {
      await navigator.clipboard.writeText(window.location.origin);
      setShared(true);
      window.setTimeout(() => setShared(false), 1600);
    }
  }

  const Icon = shared ? Check : Share2;

  return (
    <button
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white"
      type="button"
      onClick={share}
      aria-label={shared ? "링크가 복사되었습니다" : "Narrow 공유하기"}
      title={shared ? "복사됨" : "공유하기"}
    >
      <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      <span className="sr-only">{shared ? "그룹 URL이 복사되었습니다" : "그룹 URL 복사"}</span>
    </button>
  );
}
