import { GameHeader } from "@/components/organisms/GameHeader";
import { PuzzleBoard } from "@/components/organisms/PuzzleBoard";

export function DailyPuzzleTemplate() {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader />
        <PuzzleBoard />
      </div>
    </main>
  );
}
