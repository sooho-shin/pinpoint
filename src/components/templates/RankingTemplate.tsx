import { GameHeader } from "@/components/organisms/GameHeader";
import { LeaderboardPanel } from "@/components/organisms/LeaderboardPanel";

export function RankingTemplate() {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Leaderboard" title="랭킹" />
        <LeaderboardPanel />
      </div>
    </main>
  );
}
