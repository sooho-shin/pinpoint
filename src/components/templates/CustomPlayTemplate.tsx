import { GameHeader } from "@/components/organisms/GameHeader";
import { CustomPlayPanel } from "@/components/organisms/CustomPlayPanel";

export function CustomPlayTemplate({ slug }: { slug: string }) {
  return (
    <main className="app-shell">
      <div className="screen-frame">
        <GameHeader eyebrow="Custom" title="공유 문제" action="home" />
        <section className="surface mb-4 p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Public custom puzzle</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">친구가 만든 한국어 연상 퍼즐</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            이 페이지는 공유 링크를 받은 사용자가 커스텀 문제를 직접 풀 수 있는 공개 플레이 화면입니다. 문제는 정답과 다섯 개의 단서로 구성되며,
            처음에는 가장 넓은 단서 하나만 보입니다. 오답을 제출하거나 다음 단서를 열면 후보를 좁힐 수 있는 정보가 한 줄씩 추가되고,
            풀이가 끝난 뒤에만 정답과 결과 공유 버튼이 표시됩니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            커스텀 문제는 매일 공개되는 공식 문제와 별도로 운영됩니다. 제작자는 관리 링크로 공개 상태를 바꿀 수 있고, 플레이어는 부적절한 문제를 신고할 수 있습니다.
            공개 페이지에는 관리 토큰이나 제작자 식별 정보가 노출되지 않으며, 랭킹 등록은 사용자가 직접 입력한 닉네임으로만 처리됩니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            좋은 커스텀 문제는 첫 단서가 너무 직접적이지 않고, 마지막 단서에서는 정답이 자연스럽게 확정되는 흐름을 갖습니다. 단어 하나만 반복하거나
            이미 답을 포함한 문장을 넣으면 추론 과정이 사라지므로 신고 대상이 될 수 있습니다. 플레이어는 단서를 읽으며 가능한 후보를 지우고,
            결과 화면에서 자신의 풀이 단서 수를 확인할 수 있습니다.
          </p>
        </section>
        <CustomPlayPanel slug={slug} />
      </div>
    </main>
  );
}
