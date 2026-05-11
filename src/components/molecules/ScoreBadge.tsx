import { Badge } from "@/components/atoms/Badge";
import { formatElapsed } from "@/lib/format";

export function ScoreBadge({ usedClueCount, elapsedMs }: { usedClueCount: number; elapsedMs: number | null }) {
  return (
    <div className="flex gap-2">
      <Badge tone="success">{usedClueCount}단서</Badge>
      <Badge>{formatElapsed(elapsedMs)}</Badge>
    </div>
  );
}
