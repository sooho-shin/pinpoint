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
        <section className="surface mt-6 p-5">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Daily Korean word puzzle</div>
          <h2 className="mt-1 text-[20px] font-bold leading-7">오늘의 한국어 연상 퍼즐</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Narrow는 매일 오후 5시에 하나의 정답을 공개하는 한국어 단서 추론 게임입니다. 처음에는 가장 넓은 단서 하나만 보고 답을 예상하고,
            오답을 제출하거나 다음 단서를 열 때마다 후보를 좁힐 수 있는 힌트가 추가됩니다. 단서가 적을 때 맞힐수록 더 좋은 기록으로 남습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            정답은 인물, 작품, 개념, 장소, 제도, 문화 용어처럼 하나로 특정할 수 있는 주제에서 고릅니다. 단서는 정답을 직접 말하지 않고
            주변 의미를 조금씩 드러내도록 구성하며, 풀이가 끝나기 전에는 정답과 전체 단서를 숨겨 스포일러를 줄입니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            로그인하지 않아도 오늘 문제를 풀 수 있고, 로그인 후 닉네임을 설정하면 랭킹에 기록을 남길 수 있습니다. 친구와 함께 풀고 싶다면 그룹 링크나
            커스텀 문제 만들기를 이용해 같은 문제를 공유할 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            지난 문제는 아카이브에서 정답과 단서 흐름을 다시 읽을 수 있어, 오늘의 풀이 감각을 연습하는 자료로도 사용할 수 있습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
