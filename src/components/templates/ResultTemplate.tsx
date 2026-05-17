import { GameHeader } from "@/components/organisms/GameHeader";
import { DailyWinnerBanner } from "@/components/organisms/DailyWinnerBanner";
import { ResultPanel } from "@/components/organisms/ResultPanel";

export function ResultTemplate() {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Result" title="결과" />
        <DailyWinnerBanner />
        <ResultPanel />
      </div>
    </main>
  );
}
