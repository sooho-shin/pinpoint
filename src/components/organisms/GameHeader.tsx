import Link from "next/link";
import { Home, Trophy } from "lucide-react";
import { ShareButton } from "@/components/molecules/ShareButton";
import { GameGuideTooltip } from "@/components/organisms/GameGuideTooltip";

type GameHeaderProps = {
  eyebrow?: string;
  title?: string;
  action?: "ranking" | "home";
  showGuide?: boolean;
  showShare?: boolean;
};

export function GameHeader({ eyebrow, title = "Narrow", action = "ranking", showGuide = false, showShare = false }: GameHeaderProps) {
  const ActionIcon = action === "home" ? Home : Trophy;
  const actionHref = action === "home" ? "/" : "/ranking";
  const actionLabel = action === "home" ? "메인으로 돌아가기" : "오늘의 랭킹";

  return (
    <header className="mb-6 flex items-start justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{eyebrow ?? "Korean Daily Puzzle"}</div>
        <h1 className="mt-2 text-[32px] font-bold leading-[40px] text-[var(--text-primary)]">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {showGuide ? <GameGuideTooltip /> : null}
        {showShare ? <ShareButton /> : null}
        <Link
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-white"
          href={actionHref}
          aria-label={actionLabel}
        >
          <ActionIcon className="h-5 w-5 text-[var(--accent)]" />
        </Link>
      </div>
    </header>
  );
}
