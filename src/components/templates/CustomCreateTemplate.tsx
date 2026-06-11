import { GameHeader } from "@/components/organisms/GameHeader";
import { CustomCreatePanel } from "@/components/organisms/CustomCreatePanel";

export function CustomCreateTemplate() {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Custom" title="문제 만들기" action="home" />
        <CustomCreatePanel />
      </div>
    </main>
  );
}
