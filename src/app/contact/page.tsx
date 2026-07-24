import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문의",
  description: "Narrow 서비스 문의, 오류 제보, 개인정보 관련 연락 경로입니다.",
  alternates: {
    canonical: "/contact"
  }
};

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <main className="app-shell">
      <section className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Contact</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">문의</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            서비스 이용, 개인정보, 광고, 오류 제보 관련 문의를 받습니다.
          </p>

          <section className="mt-6">
            <h2 className="text-base font-bold">오류를 제보할 때</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              사용한 브라우저와 기기, 문제가 발생한 화면, 재현 순서를 함께 알려주면 확인이 빨라집니다. 오늘 문제의 정답이나 아직 공개되지 않은
              단서는 다른 사용자가 볼 수 있는 공개 이슈 제목에 적지 마세요. 로그인 오류는 이메일 주소나 인증 화면 캡처 대신 오류 문구만 남겨 주세요.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">개인정보가 포함된 문의</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              계정 삭제나 개인정보 확인처럼 본인 식별이 필요한 요청은 공개 GitHub Issues에 개인정보를 올리지 않아야 합니다.
              아래에 이메일 문의 주소가 표시되는 경우에만 해당 주소로 요청하고, 공개 오류 제보에는 재현에 필요한 최소 정보만 작성해 주세요.
            </p>
          </section>

          <div className="mt-6 space-y-4">
            {contactEmail ? (
              <a
                className="focus-ring flex min-h-14 items-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
            ) : (
              <div className="rounded-md border border-[var(--border)] bg-white p-4 text-sm leading-6 text-[var(--text-secondary)]">
                현재 이 페이지에는 공개 오류 제보 경로만 제공됩니다. 개인정보나 계정 정보는 GitHub Issues에 작성하지 마세요.
              </div>
            )}
            <a
              className="focus-ring flex min-h-14 items-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]"
              href="https://github.com/sooho-shin/pinpoint/issues"
              rel="noreferrer"
              target="_blank"
            >
              공개 오류 제보: GitHub Issues
            </a>
          </div>
          <Link
            className="focus-ring mt-8 inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]"
            href="/"
          >
            게임으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}
