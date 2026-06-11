import { GameHeader } from "@/components/organisms/GameHeader";
import { CustomRankingPanel } from "@/components/organisms/CustomRankingPanel";

export function CustomRankingTemplate({ slug }: { slug: string }) {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Custom" title="커스텀 랭킹" action="home" />
        <CustomRankingPanel slug={slug} />
      </div>
    </main>
  );
}
