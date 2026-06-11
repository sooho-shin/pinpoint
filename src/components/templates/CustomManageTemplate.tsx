import { GameHeader } from "@/components/organisms/GameHeader";
import { CustomManagePanel } from "@/components/organisms/CustomManagePanel";

export function CustomManageTemplate({ token }: { token: string }) {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Custom" title="게임 관리" action="home" />
        <CustomManagePanel token={token} />
      </div>
    </main>
  );
}
