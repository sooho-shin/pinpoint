import type { Metadata } from "next";
import Link from "next/link";

const categories = [
  ["역사/언어", "사건, 인물, 문자, 제도처럼 시간과 사회적 배경을 함께 읽어야 하는 문제입니다."],
  ["과학/천문", "현상에서 출발해 물리, 생물, 천문 개념으로 좁혀지는 문제입니다."],
  ["문화/음악", "작품, 공연, 예술 사조, 창작 방식처럼 문화적 맥락을 다룹니다."],
  ["경제/화폐", "시장, 거래, 통화, 금융 제도처럼 사회적 약속과 숫자가 함께 작동하는 주제입니다."],
  ["정치/제도", "권력, 헌법, 대표, 선거처럼 사회 규칙과 공적 제도를 다룹니다."]
];

export const metadata: Metadata = {
  title: "퍼즐 카테고리",
  description: "Narrow의 역사/언어, 과학, 문화, 경제, 정치 카테고리와 단서 구성 방식을 소개합니다.",
  alternates: {
    canonical: "/categories"
  }
};

export default function CategoriesPage() {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Categories</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">퍼즐 카테고리</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Narrow는 하나의 분야만 반복하지 않고 여러 지식 영역을 섞습니다. 카테고리는 정답을 맞히기 위한 힌트가 아니라,
            풀이가 끝난 뒤 문제의 성격을 정리하는 기준입니다.
          </p>

          <div className="mt-6 space-y-4">
            {categories.map(([title, body]) => (
              <section key={title} className="rounded-md border border-[var(--border)] bg-white p-4">
                <h2 className="text-base font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
              </section>
            ))}
          </div>

          <section className="mt-6">
            <h2 className="text-base font-bold">플레이 중에는 카테고리를 숨깁니다</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              카테고리를 먼저 보여주면 첫 단서가 가진 여러 해석 가능성이 크게 줄어듭니다. 그래서 오늘 문제를 푸는 동안에는 분야를 공개하지 않고,
              풀이가 끝난 결과와 지난 문제에서만 확인할 수 있게 합니다. 같은 단어가 역사에서는 사건을, 과학에서는 현상을 가리킬 수 있다는 점이
              연상 퍼즐의 핵심이기 때문입니다. 지난 문제에서는 카테고리별 단서 흐름을 비교하며 같은 표현이 분야에 따라 어떻게 달라지는지 복기할 수 있습니다.
            </p>
          </section>

          <div className="mt-8 grid gap-3">
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/archive">
              지난 문제 보기
            </Link>
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/difficulty">
              난이도 기준 보기
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
