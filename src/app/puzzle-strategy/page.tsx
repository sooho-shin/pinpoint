import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "연상 퍼즐 풀이 전략",
  description: "Narrow 한국어 연상 퍼즐을 풀 때 초반 단서, 중간 단서, 확정 단서를 읽는 방법을 정리합니다.",
  alternates: {
    canonical: "/puzzle-strategy"
  }
};

const strategies = [
  {
    title: "첫 단서는 답이 아니라 방향입니다",
    body: "1번 단서는 일부러 넓게 설계됩니다. 그림자, 균형, 소리처럼 여러 영역으로 갈 수 있는 단어가 자주 나오므로 바로 정답을 고정하기보다 후보의 범위를 적어 두는 편이 좋습니다."
  },
  {
    title: "두 번째 단서에서 영역을 바꿀 준비를 합니다",
    body: "초반에 떠올린 답이 틀렸다고 느껴질 때는 두 번째 단서를 기준으로 영역을 다시 잡습니다. 예를 들어 그림자 다음에 우주가 나오면 미술이나 빛의 현상보다 천문 개념을 우선 검토합니다."
  },
  {
    title: "세 번째 단서는 후보를 줄이는 신호입니다",
    body: "3번 단서는 대개 정답 후보를 크게 줄입니다. 사람, 장소, 과학 개념, 제도, 작품 중 어느 유형인지 보이기 시작하는 지점이므로 이때부터는 너무 넓은 상위 분류를 피해야 합니다."
  },
  {
    title: "네 번째와 다섯 번째는 확정 단서입니다",
    body: "4번 단서가 고유명사나 강한 개념을 주고, 5번 단서가 정답을 거의 확정합니다. 마지막 단서까지 봤다면 비슷한 개념을 비교해 가장 자연스러운 표현을 입력하는 것이 좋습니다."
  }
];

export default function PuzzleStrategyPage() {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Puzzle Reading</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">연상 퍼즐 풀이 전략</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Narrow의 핵심은 빠른 찍기가 아니라 단서가 좁혀지는 과정을 읽는 것입니다. 초반 단서는 여러 해석이 가능하고,
            후반 단서는 그중 하나를 확정하도록 설계됩니다.
          </p>

          <div className="mt-6 space-y-5">
            {strategies.map((strategy) => (
              <section key={strategy.title}>
                <h2 className="text-base font-bold">{strategy.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{strategy.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-6 muted-surface p-4">
            <h2 className="text-base font-bold">오답도 정보입니다</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              오답을 제출하면 다음 단서가 열립니다. 방금 입력한 오답과 새 단서를 함께 보면 어떤 방향이 틀렸는지 바로 확인할 수 있습니다.
              한 번 틀린 답은 버리는 것이 아니라 후보군을 정리하는 단서로 쓰는 편이 좋습니다.
            </p>
          </section>

          <div className="mt-8 grid gap-3">
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/difficulty">
              난이도 기준 보기
            </Link>
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/archive">
              지난 문제로 연습하기
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
