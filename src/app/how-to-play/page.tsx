import type { Metadata } from "next";
import Link from "next/link";

const examples = [
  {
    answer: "출입국",
    clues: ["경계", "통과", "도장", "비자", "여권"],
    note: "초반에는 공간이나 규칙을 떠올리게 하고, 뒤쪽 단서에서 여행과 행정 절차로 좁혀집니다."
  },
  {
    answer: "암호화",
    clues: ["암호", "약속", "열쇠", "공개키", "블록체인"],
    note: "일상어에서 시작해 보안 기술과 공개키 개념으로 수렴하는 유형입니다."
  },
  {
    answer: "부력",
    clues: ["떠오름", "밀도", "배수량", "아르키메데스", "유체"],
    note: "현상, 측정 기준, 역사적 단서를 거쳐 물리 개념을 찾도록 구성됩니다."
  }
];

export const metadata: Metadata = {
  title: "플레이 방법",
  description: "Narrow의 단서 공개, 정답 제출, 랭킹 정렬, 그룹 랭킹 규칙을 설명합니다.",
  alternates: {
    canonical: "/how-to-play"
  }
};

export default function HowToPlayPage() {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Guide</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">플레이 방법</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            오늘 문제는 최대 5개의 단서로 구성됩니다. 처음에는 1번 단서만 열리고, 오답을 제출하거나 다음 단서를 선택하면 단서가 하나씩 늘어납니다.
          </p>

          <section className="mt-6">
            <h2 className="text-base font-bold">기본 규칙</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-secondary)]">
              <li>5번째 단서 안에 정답을 맞히면 성공입니다.</li>
              <li>정답은 띄어쓰기와 일부 별칭을 허용할 수 있습니다.</li>
              <li>정답과 전체 해설은 풀이가 끝난 뒤에만 표시됩니다.</li>
              <li>매일 오후 5시에 새 문제가 공개되고, 공개일 기준 랭킹이 새로 시작됩니다.</li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">랭킹 정렬</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              오늘의 랭킹은 사용한 단서 수가 적은 기록을 먼저 보여주고, 같은 단서 수에서는 풀이 시간이 짧은 기록을 앞에 둡니다.
              그래도 같으면 먼저 제출한 기록이 위에 표시됩니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">하루 기준</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Narrow의 하루는 자정이 아니라 KST 오후 5시에 바뀝니다. 예를 들어 월요일 오후 5시에 열린 문제는 화요일 오후 4시 59분까지
              오늘 문제로 유지됩니다. 이 기준은 오늘의 랭킹, 그룹 랭킹, 1등 확성기, 문제 평가에 모두 같이 적용됩니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">평가와 한마디</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              문제를 끝까지 완료한 로그인 사용자는 랭킹 화면에서 오늘 문제에 대한 짧은 평가를 남길 수 있습니다.
              아직 풀지 않은 사람에게는 평가 목록을 보여주지 않으며, 정답이나 단서를 직접 포함한 한마디는 저장하지 않습니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">예시 문제</h2>
            <div className="mt-3 space-y-4">
              {examples.map((example) => (
                <div key={example.answer} className="rounded-md border border-[var(--border)] bg-white p-4">
                  <div className="text-sm font-bold text-[var(--text-primary)]">정답: {example.answer}</div>
                  <ol className="mt-3 space-y-2">
                    {example.clues.map((clue, index) => (
                      <li key={clue} className="flex gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--accent)]">{index + 1}</span>
                        <span>{clue}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{example.note}</p>
                </div>
              ))}
            </div>
          </section>

          <Link
            className="focus-ring mt-8 inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]"
            href="/"
          >
            오늘 문제 풀기
          </Link>
        </div>
      </article>
    </main>
  );
}
