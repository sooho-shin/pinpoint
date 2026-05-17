import { GameHeader } from "@/components/organisms/GameHeader";
import { DailyWinnerBanner } from "@/components/organisms/DailyWinnerBanner";
import { PuzzleBoard } from "@/components/organisms/PuzzleBoard";

export function DailyPuzzleTemplate() {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader />
        <DailyWinnerBanner />
        <PuzzleBoard />
      </div>
    </main>
  );
}
