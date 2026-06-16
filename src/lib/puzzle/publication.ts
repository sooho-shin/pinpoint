import { createAdminClient } from "@/lib/supabase/admin";
import { publishDailyPuzzle } from "@/lib/puzzle/publication-admin";
import { getActivePublicationDateKst } from "@/lib/puzzle/time";
import { asClues } from "@/lib/puzzle/server-format";
import type { PublicationRow, PuzzleRow } from "@/lib/puzzle/server-types";

export async function getTodayPublication(): Promise<{
  publishDateKst: string;
  publication: PublicationRow | null;
  puzzle: PuzzleRow | null;
}> {
  const admin = createAdminClient();
  const publishDateKst = getActivePublicationDateKst();
  let { data: publication, error: publicationError } = await admin
    .from("puzzle_publications")
    .select("id,puzzle_id,publish_date_kst,published_at")
    .eq("status", "published")
    .eq("publish_date_kst", publishDateKst)
    .maybeSingle();

  if (publicationError) throw publicationError;
  if (!publication) {
    const publishResult = await publishDailyPuzzle({ dateKst: publishDateKst });
    const published = publishResult.publications[0];
    if (published) {
      publication = {
        id: published.id,
        puzzle_id: published.puzzle_id,
        publish_date_kst: published.publish_date_kst,
        published_at: published.published_at
      };
    }
  }
  if (!publication) return { publishDateKst, publication: null, puzzle: null };

  const { data: puzzle, error: puzzleError } = await admin
    .from("puzzles")
    .select("id,answer,aliases,category,difficulty,clues")
    .eq("id", publication.puzzle_id)
    .single();

  if (puzzleError) throw puzzleError;

  return {
    publishDateKst,
    publication: publication as PublicationRow,
    puzzle: {
      ...(puzzle as Omit<PuzzleRow, "clues">),
      clues: asClues((puzzle as { clues: unknown }).clues)
    } satisfies PuzzleRow
  };
}
