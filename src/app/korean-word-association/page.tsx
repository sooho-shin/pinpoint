import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "한국어 연상 퍼즐이란?",
  description: "한국어 단어, 한자어, 외래어, 고유명사가 연상 퍼즐에서 어떻게 단서가 되는지 설명합니다.",
  alternates: {
    canonical: "/korean-word-association"
  }
};

export default function KoreanWordAssociationPage() {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Korean Word Association</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">한국어 연상 퍼즐이란?</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            한국어 연상 퍼즐은 단어의 뜻, 쓰임, 배경지식, 문화적 맥락을 연결해 하나의 정답을 찾는 문제입니다.
            같은 단어라도 한국어에서는 한자어, 외래어, 고유명사가 섞여 있어 단서의 결이 달라집니다.
          </p>

          <section className="mt-6">
            <h2 className="text-base font-bold">한국어 단서의 특징</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              한국어 단서는 짧아도 많은 정보를 담을 수 있습니다. 자모, 비자, 왕권, 광속 같은 단어는 한두 글자 차이로 영역이 크게 달라집니다.
              그래서 Narrow는 띄어쓰기와 별칭을 어느 정도 허용하면서도, 정답이 너무 넓은 상위 분류가 되지 않도록 조정합니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">단어보다 관계를 봅니다</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              단서 하나만 보면 여러 답이 가능합니다. 중요한 것은 단서들이 서로 어떤 관계를 만드는지 보는 것입니다.
              예를 들어 소리, 글자, 자모, 세종, 훈민정음은 각각 따로 보면 넓지만 함께 읽으면 한글창제로 수렴합니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">문화와 지식의 균형</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              문제는 단순 상식 암기를 목표로 하지 않습니다. 역사, 과학, 문화, 경제, 언어 같은 영역을 오가되 마지막 단서에서는
              검색 없이도 정답을 납득할 수 있는 공정한 힌트를 제공하는 것을 기준으로 삼습니다.
            </p>
          </section>

          <Link className="focus-ring mt-8 inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/puzzle-strategy">
            풀이 전략 읽기
          </Link>
        </div>
      </article>
    </main>
  );
}
