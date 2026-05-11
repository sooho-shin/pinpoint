import { Badge } from "@/components/atoms/Badge";
import { formatElapsed } from "@/lib/format";

export type RankingRowData = {
  id: string;
  rank: number;
  nickname: string;
  usedClueCount: number;
  elapsedMs: number;
  submittedAt: string;
  isMe?: boolean;
};

export function RankingRow({ row }: { row: RankingRowData }) {
  return (
    <div className="flex h-16 items-center gap-3 rounded-md px-3" style={{ background: row.isMe ? "var(--surface-muted)" : "transparent" }}>
      <div className="w-7 text-sm font-bold text-[var(--accent)]">{row.rank}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.nickname}</div>
        <div className="text-xs text-[var(--text-secondary)]">{formatElapsed(row.elapsedMs)}</div>
      </div>
      <Badge tone={row.rank === 1 ? "success" : "neutral"}>{row.usedClueCount}단서</Badge>
    </div>
  );
}
