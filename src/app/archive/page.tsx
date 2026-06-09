import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePublicationDateKst } from "@/lib/puzzle/time";
import { formatKoreanDate } from "@/lib/format";

type ArchiveRow = {
  id: string;
  publish_date_kst: string;
  puzzle: ArchivePuzzle | null;
};

type ArchivePuzzle = {
  answer: string;
  category: string;
  difficulty: number;
  clues: unknown;
};

type RawArchiveRow = {
  id: string;
  publish_date_kst: string;
  puzzles: ArchivePuzzle | ArchivePuzzle[] | null;
};

export const metadata: Metadata = {
  title: "지난 문제",
  description: "Narrow에서 이전에 공개된 한국어 연상 퍼즐의 정답, 단서, 카테고리를 모아 봅니다.",
  alternates: {
    canonical: "/archive"
  }
};

export const dynamic = "force-dynamic";

function asClues(value: unknown) {
  return Array.isArray(value) ? value.map(String).slice(0, 5) : [];
}

function normalizeArchiveRow(row: RawArchiveRow): ArchiveRow {
  const puzzle = Array.isArray(row.puzzles) ? (row.puzzles[0] ?? null) : row.puzzles;
  return {
    id: row.id,
    publish_date_kst: row.publish_date_kst,
    puzzle
  };
}

async function getArchiveRows() {
  const activeDate = getActivePublicationDateKst();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("puzzle_publications")
    .select("id,publish_date_kst,puzzles(answer,category,difficulty,clues)")
    .eq("status", "published")
    .lt("publish_date_kst", activeDate)
    .order("publish_date_kst", { ascending: false })
    .limit(30);

  if (error) throw error;
  return ((data ?? []) as RawArchiveRow[]).map(normalizeArchiveRow);
}

export default async function ArchivePage() {
  const rows = await getArchiveRows();

  return (
    <main className="app-shell">
      <article className="screen-frame">
        <div className="surface p-6">
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Archive</div>
          <h1 className="mt-1 text-[24px] font-bold leading-8">지난 문제</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            오늘 활성 문제를 제외한 이전 공개 문제를 모았습니다. 이미 공개 기간이 지난 문제의 정답과 단서를 확인할 수 있습니다.
            각 문제의 상세 페이지에서는 단서가 어떻게 정답으로 수렴했는지와 관련 배경 지식을 함께 읽을 수 있습니다.
          </p>

          <div className="mt-6 space-y-4">
            {rows.length === 0 ? (
              <div className="muted-surface p-4 text-sm leading-6 text-[var(--text-secondary)]">
                아직 아카이브에 표시할 지난 문제가 없습니다. 첫 공개 문제의 운영일이 지나면 이곳에 정답, 단서, 카테고리, 난이도가 쌓입니다.
                현재 진행 중인 문제는 스포일러 방지를 위해 공개 기간이 끝난 뒤에만 표시합니다.
              </div>
            ) : (
              rows.map((row) => {
                const puzzle = row.puzzle;
                const clues = asClues(puzzle?.clues);
                return (
                  <section key={row.id} className="rounded-md border border-[var(--border)] bg-white p-4">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">{formatKoreanDate(row.publish_date_kst)}</div>
                    <h2 className="mt-1 text-lg font-bold">{puzzle?.answer ?? "공개 문제"}</h2>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">
                      {puzzle?.category ?? "분류 없음"} · 난이도 {puzzle?.difficulty ?? "-"}
                    </div>
                    <ol className="mt-3 space-y-2">
                      {clues.map((clue, index) => (
                        <li key={`${row.id}-${clue}`} className="flex gap-3 text-sm text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--accent)]">{index + 1}</span>
                          <span>{clue}</span>
                        </li>
                      ))}
                    </ol>
                    <Link
                      className="focus-ring mt-4 inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--accent)]"
                      href={`/archive/${row.id}`}
                    >
                      단서 해설 읽기
                    </Link>
                  </section>
                );
              })
            )}
          </div>

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
