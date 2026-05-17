import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalTemplate({
  eyebrow,
  title,
  description,
  sections
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">{eyebrow}</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          <div className="mt-6 space-y-6">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-base font-bold">{section.title}</h2>
                <div className="mt-2 space-y-2">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-6 text-[var(--text-secondary)]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <Link
            className="focus-ring mt-8 inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]"
            href="/"
          >
            게임으로 돌아가기
          </Link>
        </div>
      </article>
    </main>
  );
}
