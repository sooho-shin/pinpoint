import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "난이도 기준",
  description: "Narrow 퍼즐의 난이도 2와 3 기준, 단서 1부터 5까지의 역할을 설명합니다.",
  alternates: {
    canonical: "/difficulty"
  }
};

export default function DifficultyPage() {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Difficulty</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">난이도 기준</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Narrow의 현재 문제는 대체로 난이도 2와 3을 기준으로 운영합니다. 초반 단서는 여전히 생각할 여지를 남기지만,
            마지막 단서까지 봤을 때 대중적인 지식으로 정답에 도달할 수 있어야 합니다.
          </p>

          <section className="mt-6 rounded-md border border-[var(--border)] bg-white p-4">
            <h2 className="text-base font-bold">난이도 2</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              널리 알려진 인물, 개념, 역사적 사건, 문화 용어가 중심입니다. 3번 단서부터는 방향이 비교적 분명해지고,
              4번 또는 5번 단서에서는 대부분의 사용자가 정답을 확정할 수 있어야 합니다.
            </p>
          </section>

          <section className="mt-4 rounded-md border border-[var(--border)] bg-white p-4">
            <h2 className="text-base font-bold">난이도 3</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              조금 더 배경지식이 필요하지만 마지막 단서가 공정해야 합니다. 예술 사조, 경제 용어, 과학 개념처럼 익숙하지 않을 수 있는 주제도
              단서가 충분히 수렴하면 난이도 3으로 운영합니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">단서별 역할</h2>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
              <li><strong className="text-[var(--text-primary)]">1번:</strong> 넓은 이미지나 분위기</li>
              <li><strong className="text-[var(--text-primary)]">2번:</strong> 큰 영역을 잡는 힌트</li>
              <li><strong className="text-[var(--text-primary)]">3번:</strong> 후보를 줄이는 중간 단서</li>
              <li><strong className="text-[var(--text-primary)]">4번:</strong> 강한 식별자</li>
              <li><strong className="text-[var(--text-primary)]">5번:</strong> 정답을 확정하는 단서</li>
            </ol>
          </section>

          <Link className="focus-ring mt-8 inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/categories">
            카테고리별 문제 보기
          </Link>
        </div>
      </article>
    </main>
  );
}
