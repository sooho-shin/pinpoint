#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { CANDIDATES_PATH, DAILY_PATH, parseArgs, readStore } from "./lib/puzzle-store.js";

const args = parseArgs();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

function getKstDateString(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function toDbPuzzle(item) {
  const dbStatus = item.status === "rejected" ? "rejected" : item.status === "approved" ? "approved" : "generated";
  return {
    id: item.id,
    locale: "ko",
    answer: item.answer,
    aliases: item.aliases,
    category: item.category,
    difficulty: item.difficulty,
    clues: item.clues,
    rationale: item.rationale,
    status: dbStatus,
    quality_score: item.qualityScore ?? null,
    issue_flags: item.issueFlags ?? [],
    review_reason: item.reviewReason ?? null,
    reviewed_at: item.reviewedAt ?? null
  };
}

function toDbPublication(item) {
  if (!item.scheduledAt) throw new Error(`Missing scheduledAt for ${item.id}.`);
  const scheduledAt = new Date(item.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error(`Invalid scheduledAt for ${item.id}: ${item.scheduledAt}`);

  return {
    puzzle_id: item.id,
    publish_date_kst: getKstDateString(scheduledAt),
    status: item.status === "published" ? "published" : "scheduled",
    scheduled_at: scheduledAt.toISOString(),
    published_at: item.status === "published" && item.publishedAt ? new Date(item.publishedAt).toISOString() : null
  };
}

async function main() {
  const dryRun = Boolean(args["dry-run"]);
  const candidateStore = await readStore(CANDIDATES_PATH);
  const dailyStore = await readStore(DAILY_PATH);
  const dailyIds = new Set(dailyStore.items.map((item) => item.id));
  const syncableCandidates = candidateStore.items.filter((item) => ["generated", "approved", "rejected"].includes(item.status));
  const syncableDaily = dailyStore.items.filter((item) => ["scheduled", "published"].includes(item.status));
  const puzzleItems = [...syncableCandidates.filter((item) => !dailyIds.has(item.id)), ...syncableDaily];
  const uniquePuzzles = [...new Map(puzzleItems.map((item) => [item.id, item])).values()].map(toDbPuzzle);
  const publications = syncableDaily.map(toDbPublication);

  if (dryRun) {
    console.log(JSON.stringify({ dryRun, puzzles: uniquePuzzles.length, publications }, null, 2));
    return;
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  if (uniquePuzzles.length > 0) {
    const { error } = await supabase.from("puzzles").upsert(uniquePuzzles, { onConflict: "id" });
    if (error) throw error;
  }

  if (publications.length > 0) {
    const dates = [...new Set(publications.map((publication) => publication.publish_date_kst))];
    const { data: existingPublications, error: existingError } = await supabase
      .from("puzzle_publications")
      .select("publish_date_kst,status,puzzle_id")
      .in("publish_date_kst", dates);
    if (existingError) throw existingError;

    const existingByDate = new Map((existingPublications ?? []).map((publication) => [String(publication.publish_date_kst), publication]));
    const safePublications = publications.filter((publication) => {
      const existing = existingByDate.get(publication.publish_date_kst);
      return !existing || existing.status !== "published";
    });
    const skippedPublished = publications.length - safePublications.length;

    if (safePublications.length === 0) {
      console.log(`Skipped ${skippedPublished} already-published publication(s).`);
      return;
    }

    const { error } = await supabase.from("puzzle_publications").upsert(safePublications, { onConflict: "publish_date_kst" });
    if (error) throw error;
    if (skippedPublished > 0) console.log(`Skipped ${skippedPublished} already-published publication(s).`);
  }

  console.log(`Synced ${uniquePuzzles.length} puzzle(s) and ${publications.length} publication(s) to Supabase.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
