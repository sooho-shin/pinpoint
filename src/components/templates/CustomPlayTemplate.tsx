import { GameHeader } from "@/components/organisms/GameHeader";
import { CustomPlayPanel } from "@/components/organisms/CustomPlayPanel";

export function CustomPlayTemplate({ slug }: { slug: string }) {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Custom" title="공유 문제" action="home" />
        <CustomPlayPanel slug={slug} />
      </div>
    </main>
  );
}
