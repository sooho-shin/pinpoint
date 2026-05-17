import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문의",
  description: "Pinpoint 문의"
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
          <div className="mt-6 space-y-4">
            {contactEmail ? (
              <a
                className="focus-ring flex min-h-14 items-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
            ) : null}
            <a
              className="focus-ring flex min-h-14 items-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]"
              href="https://github.com/sooho-shin/pinpoint/issues"
              rel="noreferrer"
              target="_blank"
            >
              GitHub Issues
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
