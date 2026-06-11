import { GameHeader } from "@/components/organisms/GameHeader";
import { DailyWinnerBanner } from "@/components/organisms/DailyWinnerBanner";
import { PuzzleBoard } from "@/components/organisms/PuzzleBoard";
import { ButtonLink } from "@/components/atoms/Button";

export function DailyPuzzleTemplate({ groupCode }: { groupCode?: string }) {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader showGuide showShare />
        <DailyWinnerBanner />
        <PuzzleBoard groupCode={groupCode} />
        <div className="mt-4">
          <ButtonLink href="/custom/new" variant="secondary">내 문제 만들기</ButtonLink>
        </div>
      </div>
    </main>
  );
}
