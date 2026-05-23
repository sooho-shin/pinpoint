import { GameHeader } from "@/components/organisms/GameHeader";
import { DailyWinnerBanner } from "@/components/organisms/DailyWinnerBanner";
import { PuzzleBoard } from "@/components/organisms/PuzzleBoard";

export function DailyPuzzleTemplate({ groupCode }: { groupCode?: string }) {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader showGuide showShare />
        <DailyWinnerBanner />
        <PuzzleBoard groupCode={groupCode} />
      </div>
    </main>
  );
}
