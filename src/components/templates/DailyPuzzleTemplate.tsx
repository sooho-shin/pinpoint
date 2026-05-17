import { GameHeader } from "@/components/organisms/GameHeader";
import { DailyWinnerBanner } from "@/components/organisms/DailyWinnerBanner";
import { GameGuideTooltip } from "@/components/organisms/GameGuideTooltip";
import { PuzzleBoard } from "@/components/organisms/PuzzleBoard";

export function DailyPuzzleTemplate() {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader />
        <GameGuideTooltip />
        <DailyWinnerBanner />
        <PuzzleBoard />
      </div>
    </main>
  );
}
