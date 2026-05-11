#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

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

async function main() {
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const now = new Date().toISOString();
  const publishDateKst = getKstDateString();
  const puzzleId = `ko-dev-${publishDateKst.replaceAll("-", "")}`;

  const puzzle = {
    id: puzzleId,
    locale: "ko",
    answer: "출입국",
    aliases: ["출입국 심사", "입국심사", "출국심사"],
    category: "사회/제도",
    difficulty: 4,
    clues: ["경계", "통과", "도장", "비자", "여권"],
    rationale: "초반에는 이동과 경계로 열어두고, 후반에는 비자와 여권으로 출입국 절차에 수렴한다.",
    status: "approved",
    quality_score: 90,
    issue_flags: [],
    reviewed_at: now
  };

  const { error: puzzleError } = await supabase
    .from("puzzles")
    .upsert(puzzle, { onConflict: "id" });

  if (puzzleError) throw puzzleError;

  const { error: publicationError } = await supabase
    .from("puzzle_publications")
    .upsert(
      {
        puzzle_id: puzzleId,
        publish_date_kst: publishDateKst,
        status: "published",
        scheduled_at: now,
        published_at: now
      },
      { onConflict: "publish_date_kst" }
    );

  if (publicationError) throw publicationError;

  console.log(`Seeded today's puzzle: ${publishDateKst} (${puzzleId})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
