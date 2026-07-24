import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatKoreanDate } from "@/lib/format";
import { getPuzzleArticle, hasPuzzleArticle } from "@/lib/puzzle/content";
import { getActivePublicationDateKst } from "@/lib/puzzle/time";
import { createAdminClient } from "@/lib/supabase/admin";

type ArchiveDetailPuzzle = {
  answer: string;
  aliases: string[];
  category: string;
  difficulty: number;
  clues: unknown;
  rationale: string | null;
};

type RawArchiveDetail = {
  id: string;
  publish_date_kst: string;
  puzzles: ArchiveDetailPuzzle | ArchiveDetailPuzzle[] | null;
};

type ArchiveDetail = {
  id: string;
  publishDateKst: string;
  puzzle: ArchiveDetailPuzzle;
};

export const dynamic = "force-dynamic";

function asClues(value: unknown) {
  return Array.isArray(value) ? value.map(String).slice(0, 5) : [];
}

function normalizeDetail(row: RawArchiveDetail): ArchiveDetail | null {
  const puzzle = Array.isArray(row.puzzles) ? (row.puzzles[0] ?? null) : row.puzzles;
  if (!puzzle) return null;
  return {
    id: row.id,
    publishDateKst: row.publish_date_kst,
    puzzle
  };
}

async function getArchiveDetail(id: string) {
  const activeDate = getActivePublicationDateKst();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("puzzle_publications")
    .select("id,publish_date_kst,puzzles(answer,aliases,category,difficulty,clues,rationale)")
    .eq("id", id)
    .eq("status", "published")
    .lt("publish_date_kst", activeDate)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeDetail(data as RawArchiveDetail) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getArchiveDetail(id);
  if (!detail) {
    return {
      title: "지난 문제 해설",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: `${detail.puzzle.answer} 단서 해설`,
    description: `${formatKoreanDate(detail.publishDateKst)} 공개 문제 ${detail.puzzle.answer}의 단서 흐름과 배경 지식을 정리했습니다.`,
    alternates: {
      canonical: `/archive/${id}`
    },
    robots: hasPuzzleArticle(detail.puzzle.answer)
      ? { index: true, follow: true }
      : { index: false, follow: true }
  };
}

export default async function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getArchiveDetail(id);
  if (!detail) notFound();

  const clues = asClues(detail.puzzle.clues);
  const article = getPuzzleArticle(detail.puzzle.answer);

  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">{formatKoreanDate(detail.publishDateKst)}</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">{detail.puzzle.answer} 단서 해설</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{article.overview}</p>

          <section className="mt-6 rounded-md border border-[var(--border)] bg-white p-4">
            <h2 className="text-base font-bold">문제 정보</h2>
            <dl className="mt-3 grid gap-2 text-sm leading-6 text-[var(--text-secondary)]">
              <div>
                <dt className="font-semibold text-[var(--text-primary)]">정답</dt>
                <dd>{detail.puzzle.answer}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-primary)]">카테고리</dt>
                <dd>{detail.puzzle.category}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-primary)]">난이도</dt>
                <dd>{detail.puzzle.difficulty}</dd>
              </div>
              {detail.puzzle.aliases.length > 0 ? (
                <div>
                  <dt className="font-semibold text-[var(--text-primary)]">함께 인정되는 표현</dt>
                  <dd>{detail.puzzle.aliases.join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">단서별 흐름</h2>
            <ol className="mt-3 space-y-3">
              {clues.map((clue, index) => (
                <li key={`${detail.id}-${clue}`} className="rounded-md border border-[var(--border)] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">{index + 1}</span>
                    <span className="text-base font-bold">{clue}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{article.clueNotes[index] ?? "이 단서는 정답 후보를 더 좁히는 역할을 합니다."}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">배경 지식</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              {article.background.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">풀이 팁</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{article.strategyTip}</p>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold">관련해서 생각해 볼 개념</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-secondary)]">
              {article.related.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {detail.puzzle.rationale ? (
            <section className="mt-6 muted-surface p-4">
              <h2 className="text-base font-bold">출제 의도</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{detail.puzzle.rationale}</p>
            </section>
          ) : null}

          <div className="mt-8 grid gap-3">
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/archive">
              지난 문제 목록
            </Link>
            <Link className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)]" href="/puzzle-strategy">
              풀이 전략 읽기
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
