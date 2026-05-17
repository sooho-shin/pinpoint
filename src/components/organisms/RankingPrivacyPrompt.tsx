import { ButtonLink } from "@/components/atoms/Button";

export function RankingPrivacyPrompt() {
  return (
    <section className="surface min-h-[360px] p-6">
      <h2 className="text-[22px] font-bold leading-[30px]">랭킹 참여</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">오늘 문제는 바로 풀 수 있고, 랭킹 등록과 1등 메시지는 Google 로그인과 닉네임 설정이 필요합니다.</p>
      <div className="mt-8">
        <ButtonLink href="/signin">로그인하기</ButtonLink>
      </div>
    </section>
  );
}
