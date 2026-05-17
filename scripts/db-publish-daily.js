#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "./lib/puzzle-store.js";

const args = parseArgs();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getKstHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false }).format(date));
}

async function main() {
  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid --now: ${args.now}`);

  const force = Boolean(args.force);
  const publishDateKst = args.date ? String(args.date) : getKstDateString(now);
  if (!force && getKstHour(now) < 17) {
    console.log(`Skipped ${publishDateKst}: before KST 17:00. Use --force to publish manually.`);
    return;
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: existingPublished, error: existingError } = await supabase
    .from("puzzle_publications")
    .select("id,puzzle_id,publish_date_kst,status,published_at")
    .eq("publish_date_kst", publishDateKst)
    .eq("status", "published")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingPublished) {
    console.log(`Publication already published for ${publishDateKst}: ${existingPublished.puzzle_id}.`);
    return;
  }

  const { data, error } = await supabase
    .from("puzzle_publications")
    .update({
      status: "published",
      published_at: now.toISOString()
    })
    .eq("publish_date_kst", publishDateKst)
    .eq("status", "scheduled")
    .lte("scheduled_at", now.toISOString())
    .select("id,puzzle_id,publish_date_kst,status,published_at");

  if (error) throw error;
  if ((data?.length ?? 0) > 0) {
    console.log(`Published ${data?.length ?? 0} scheduled publication(s) for ${publishDateKst}.`);
    return;
  }

  const { data: usedPublications, error: usedError } = await supabase
    .from("puzzle_publications")
    .select("puzzle_id");
  if (usedError) throw usedError;
  const usedPuzzleIds = new Set((usedPublications ?? []).map((row) => String(row.puzzle_id)));

  const { data: puzzles, error: puzzleError } = await supabase
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
    console.log(`Skipped ${publishDateKst}: no available puzzle.`);
    return;
  }

  const { data: created, error: createError } = await supabase
    .from("puzzle_publications")
    .insert({
      puzzle_id: selectedPuzzle.id,
      publish_date_kst: publishDateKst,
      status: "published",
      scheduled_at: now.toISOString(),
      published_at: now.toISOString()
    })
    .select("id,puzzle_id,publish_date_kst,status,published_at")
    .single();
  if (createError) throw createError;
  console.log(`Created published publication for ${publishDateKst}: ${created.puzzle_id}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
