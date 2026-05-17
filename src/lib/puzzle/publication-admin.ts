import { createAdminClient } from "@/lib/supabase/admin";

type PublishDailyOptions = {
  dateKst?: string;
  force?: boolean;
  now?: Date;
};

export type PublishDailyResult = {
  publishDateKst: string;
  eligible: boolean;
  publishedCount: number;
  createdCount: number;
  skippedReason?: string;
  publications: Array<{
    id: string;
    puzzle_id: string;
    publish_date_kst: string;
    status: string;
    scheduled_at: string;
    published_at: string | null;
  }>;
};

export function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getKstHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false
    }).format(date)
  );
}

export async function publishDailyPuzzle(options: PublishDailyOptions = {}): Promise<PublishDailyResult> {
  const now = options.now ?? new Date();
  const publishDateKst = options.dateKst ?? getKstDateString(now);
  const eligible = Boolean(options.force) || getKstHour(now) >= 17;

  if (!eligible) {
    return {
      publishDateKst,
      eligible,
      publishedCount: 0,
      createdCount: 0,
      skippedReason: "before_kst_17",
      publications: []
    };
  }

  const admin = createAdminClient();
  const { data: existingPublished, error: existingError } = await admin
    .from("puzzle_publications")
    .select("id,puzzle_id,publish_date_kst,status,scheduled_at,published_at")
    .eq("publish_date_kst", publishDateKst)
    .eq("status", "published")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingPublished) {
    return {
      publishDateKst,
      eligible,
      publishedCount: 0,
      createdCount: 0,
      publications: [existingPublished as PublishDailyResult["publications"][number]]
    };
  }

  const { data, error } = await admin
    .from("puzzle_publications")
    .update({
      status: "published",
      published_at: now.toISOString()
    })
    .eq("publish_date_kst", publishDateKst)
    .eq("status", "scheduled")
    .lte("scheduled_at", now.toISOString())
    .select("id,puzzle_id,publish_date_kst,status,scheduled_at,published_at");

  if (error) throw error;

  const publications = (data ?? []) as PublishDailyResult["publications"];
  if (publications.length > 0) {
    return {
      publishDateKst,
      eligible,
      publishedCount: publications.length,
      createdCount: 0,
      publications
    };
  }

  const { data: usedPublications, error: usedError } = await admin
    .from("puzzle_publications")
    .select("puzzle_id");
  if (usedError) throw usedError;

  const usedPuzzleIds = new Set((usedPublications ?? []).map((row) => String(row.puzzle_id)));
  const { data: puzzles, error: puzzleError } = await admin
    .from("puzzles")
    .select("id")
    .eq("locale", "ko")
    .in("status", ["generated", "approved"])
    .gte("quality_score", 70)
    .order("created_at", { ascending: false })
    .limit(100);
  if (puzzleError) throw puzzleError;

  const selectedPuzzle = (puzzles ?? []).find((puzzle) => !usedPuzzleIds.has(String(puzzle.id)));
  if (!selectedPuzzle) {
    return {
      publishDateKst,
      eligible,
      publishedCount: 0,
      createdCount: 0,
      skippedReason: "no_available_puzzle",
      publications: []
    };
  }

  const { data: created, error: createError } = await admin
    .from("puzzle_publications")
    .insert({
      puzzle_id: selectedPuzzle.id,
      publish_date_kst: publishDateKst,
      status: "published",
      scheduled_at: now.toISOString(),
      published_at: now.toISOString()
    })
    .select("id,puzzle_id,publish_date_kst,status,scheduled_at,published_at")
    .single();
  if (createError) throw createError;

  return {
    publishDateKst,
    eligible,
    publishedCount: 0,
    createdCount: 1,
    publications: [created as PublishDailyResult["publications"][number]]
  };
}
