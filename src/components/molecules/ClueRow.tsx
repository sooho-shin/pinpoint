import { Lock } from "lucide-react";
import { ClueNumber } from "@/components/atoms/ClueNumber";

export function ClueRow({ index, clue, locked = false }: { index: number; clue?: string; locked?: boolean }) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0">
      <ClueNumber value={index} />
      <div className="min-w-0 flex-1 break-words text-base font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">
        {locked ? <span className="text-[var(--text-secondary)]">잠긴 단서</span> : clue}
      </div>
      {locked ? <Lock aria-hidden="true" className="h-4 w-4 text-[var(--text-secondary)]" /> : null}
    </div>
  );
}
