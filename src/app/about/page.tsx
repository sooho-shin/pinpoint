import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Narrow 소개",
  description: "Narrow는 매일 오후 5시에 공개되는 한국어 연상 퍼즐입니다. 단서, 랭킹, 그룹 랭킹 운영 방식을 소개합니다.",
  alternates: {
    canonical: "/about"
  }
};

export default function AboutPage() {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">About</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">Narrow 소개</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Narrow는 여러 방향으로 해석될 수 있는 한국어 단서를 하나씩 좁혀 가며 오늘의 정답을 맞히는 일일 연상 퍼즐입니다.
            매일 오후 5시에 새 문제가 열리고, 다음날 오후 5시 전까지 같은 문제가 유지됩니다.
          </p>

          <section className="mt-6">
            <h2 className="text-base font-bold">무엇을 맞히나요?</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              정답은 인물, 작품, 제도, 과학 개념, 문화 용어처럼 하나의 구체적인 주제입니다. 첫 단서는 일부러 넓고 모호하게 시작하며,
              뒤로 갈수록 답이 하나로 좁혀지도록 설계합니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">왜 단서 수가 중요한가요?</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              적은 단서로 맞힐수록 더 높은 순위에 오릅니다. 오늘의 랭킹은 사용한 단서 수, 풀이 시간, 제출 시각 순서로 정렬됩니다.
              로그인 후 닉네임을 설정하면 기록을 랭킹에 남길 수 있습니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">함께 푸는 방식</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              전체 랭킹 외에도 초대 링크 기반 그룹 랭킹을 제공합니다. 친구나 동료에게 링크를 공유하면 같은 그룹 안에서 오늘 기록만 비교할 수 있습니다.
              현재 1등은 다음 공개 전까지 메인 화면에 짧은 확성기 메시지를 남길 수 있습니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">문제는 어떻게 고르나요?</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              문제 후보는 자동으로 바로 게시하지 않습니다. 정답이 너무 넓지 않은지, 단서에 정답이 직접 들어가지 않는지,
              1번과 2번 단서만으로 답이 너무 쉽게 보이지 않는지 검토한 뒤 공개 후보로 저장합니다.
              공개된 문제는 지난 문제 페이지에 남기고, 현재 활성 문제는 아카이브에서 제외해 스포일러를 막습니다.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">운영과 개인정보</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              비로그인 사용자는 브라우저별 익명 세션으로 풀이를 이어가고, Google 로그인 사용자는 닉네임으로만 랭킹에 표시됩니다.
              이메일, 제출한 오답, 내부 식별자는 공개 랭킹과 공유 화면에 표시하지 않습니다.
              광고가 도입되더라도 정답 입력, 제출, 다음 단서 버튼 주변에는 배치하지 않는 것을 원칙으로 합니다.
            </p>
          </section>

          <div className="mt-8 grid gap-3">
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/how-to-play">
              플레이 방법 보기
            </Link>
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/">
              오늘 문제 풀기
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
