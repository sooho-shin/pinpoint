import Link from "next/link";
import { Trophy } from "lucide-react";

export function GameHeader({ eyebrow, title = "Pinpoint" }: { eyebrow?: string; title?: string }) {
  return (
    <header className="mb-6 flex items-start justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{eyebrow ?? "Korean Daily Puzzle"}</div>
        <h1 className="mt-2 text-[32px] font-bold leading-[40px] text-[var(--text-primary)]">{title}</h1>
      </div>
      <Link
        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white"
        href="/ranking"
        aria-label="오늘의 랭킹"
      >
        <Trophy className="h-5 w-5 text-[var(--accent)]" />
      </Link>
    </header>
  );
}
