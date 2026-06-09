import type { Metadata } from "next";
import Link from "next/link";

const faqs = [
  ["정답은 어떻게 인정되나요?", "띄어쓰기와 일부 별칭을 허용합니다. 최근에는 정답의 핵심어가 충분히 분명한 경우도 인정하도록 조정했습니다. 다만 한 글자처럼 지나치게 짧은 입력은 오답으로 처리합니다."],
  ["오답을 제출하면 어떻게 되나요?", "오답을 제출하면 다음 단서가 열립니다. 화면에는 방금 입력한 오답이 표시되어, 어떤 후보를 버리고 새 단서를 해석해야 하는지 확인할 수 있습니다."],
  ["하루 기준은 언제 바뀌나요?", "Narrow의 하루는 KST 오후 5시에 바뀝니다. 오후 5시 전까지는 전날 공개된 문제가 오늘 문제로 유지됩니다."],
  ["로그인하지 않아도 풀 수 있나요?", "네. 비로그인 사용자도 오늘 문제를 풀 수 있습니다. 다만 랭킹 등록, 그룹 참여, 1등 메시지 작성은 Google 로그인과 닉네임 설정이 필요합니다."],
  ["지난 문제에는 현재 문제도 보이나요?", "아니요. 현재 활성 문제는 스포일러 방지를 위해 아카이브에서 제외합니다. 공개 기간이 지난 문제만 정답과 해설을 볼 수 있습니다."]
];

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description: "Narrow의 정답 인정, 오답 처리, 공개 시간, 로그인, 지난 문제 정책을 정리했습니다.",
  alternates: {
    canonical: "/faq"
  }
};

export default function FaqPage() {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">FAQ</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">자주 묻는 질문</h1>
          <div className="mt-6 space-y-5">
            {faqs.map(([question, answer]) => (
              <section key={question}>
                <h2 className="text-base font-bold">{question}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{answer}</p>
              </section>
            ))}
          </div>
          <Link className="focus-ring mt-8 inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/how-to-play">
            플레이 방법 보기
          </Link>
        </div>
      </article>
    </main>
  );
}
