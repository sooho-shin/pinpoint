import { GameHeader } from "@/components/organisms/GameHeader";
import { LeaderboardPanel } from "@/components/organisms/LeaderboardPanel";

export function RankingTemplate({ groupCode, activeTab = "daily" }: { groupCode?: string; activeTab?: "daily" | "group" }) {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Leaderboard" title="랭킹" action="home" />
        <LeaderboardPanel groupCode={groupCode} activeTab={activeTab} />
      </div>
    </main>
  );
}
