#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "./lib/puzzle-store.js";

const args = parseArgs();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function getKstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour")
  };
}

function formatUtcDateMs(utcMs) {
  return new Date(utcMs).toISOString().slice(0, 10);
}

function getActivePublicationDateKst(date = new Date()) {
  const { year, month, day, hour } = getKstParts(date);
  const currentKstDateUtcMs = Date.UTC(year, month - 1, day);
  const activeDateUtcMs = hour < 17 ? currentKstDateUtcMs - 24 * 60 * 60 * 1000 : currentKstDateUtcMs;
  return formatUtcDateMs(activeDateUtcMs);
}

function addKstDate(dateText, days) {
  const [year, month, day] = dateText.split("-").map(Number);
  return formatUtcDateMs(Date.UTC(year, month - 1, day + days));
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = String(row[field] ?? "null");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

async function selectOrThrow(label, query) {
  const { data, error, count } = await query;
  if (error) throw new Error(`${label} failed: ${error.message}`);
  return { data: data ?? [], count: count ?? null };
}

async function countRows(table, buildQuery = (query) => query) {
  const { count, error } = await buildQuery(supabase.from(table).select("*", { count: "exact", head: true }));
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid --now: ${args.now}`);

  const showAnswer = Boolean(args["show-answer"]);
  const activeDateKst = args.date ? String(args.date) : getActivePublicationDateKst(now);
  const nextDateKst = addKstDate(activeDateKst, 1);

  const { data: publicationRows } = await selectOrThrow(
    "active publication lookup",
    supabase
      .from("puzzle_publications")
      .select("id,puzzle_id,publish_date_kst,status,scheduled_at,published_at")
      .eq("publish_date_kst", activeDateKst)
      .order("scheduled_at", { ascending: true })
  );
  const activePublication = publicationRows.find((row) => row.status === "published") ?? publicationRows[0] ?? null;

  let puzzle = null;
  if (activePublication) {
    const { data: puzzleRows } = await selectOrThrow(
      "active puzzle lookup",
      supabase
        .from("puzzles")
        .select("id,locale,answer,category,difficulty,status,quality_score,clues")
        .eq("id", activePublication.puzzle_id)
        .limit(1)
    );
    const row = puzzleRows[0];
    if (row) {
      const clues = Array.isArray(row.clues) ? row.clues.map(String) : [];
      puzzle = {
        id: String(row.id),
        locale: String(row.locale),
        category: String(row.category),
        difficulty: Number(row.difficulty),
        status: String(row.status),
        qualityScore: row.quality_score === null ? null : Number(row.quality_score),
        clueCount: clues.length,
        ...(showAnswer ? { answer: String(row.answer), clues } : {})
      };
    }
  }

  const publicationId = activePublication?.id ? String(activePublication.id) : null;
  const [attempts, leaderboardEntries, winnerMessages, feedbackRows, groups, upcoming, customStatusRows] = await Promise.all([
    publicationId
      ? selectOrThrow(
          "attempts lookup",
          supabase
            .from("attempts")
            .select("id,status,is_ranked,user_id,anonymous_session_id", { count: "exact" })
            .eq("publication_id", publicationId)
        )
      : { data: [], count: 0 },
    publicationId
      ? selectOrThrow(
          "leaderboard lookup",
          supabase
            .from("leaderboard_entries")
            .select("id,rank_status,user_id,anonymous_session_id", { count: "exact" })
            .eq("publication_id", publicationId)
        )
      : { data: [], count: 0 },
    publicationId
      ? selectOrThrow(
          "winner message lookup",
          supabase
            .from("daily_winner_messages")
            .select("id,message_status,nickname_snapshot,message,visible_until", { count: "exact" })
            .eq("publication_id", publicationId)
        )
      : { data: [], count: 0 },
    publicationId
      ? selectOrThrow(
          "feedback lookup",
          supabase
            .from("daily_puzzle_feedback")
            .select("id,feedback_status", { count: "exact" })
            .eq("publication_id", publicationId)
        )
      : { data: [], count: 0 },
    publicationId
      ? selectOrThrow(
          "groups lookup",
          supabase
            .from("groups")
            .select("id,owner_user_id", { count: "exact" })
            .eq("publication_id", publicationId)
        )
      : { data: [], count: 0 },
    selectOrThrow(
      "upcoming publication lookup",
      supabase
        .from("puzzle_publications")
        .select("id,puzzle_id,publish_date_kst,status,scheduled_at,published_at")
        .gte("publish_date_kst", activeDateKst)
        .lte("publish_date_kst", addKstDate(activeDateKst, 7))
        .order("publish_date_kst", { ascending: true })
        .limit(10)
    ),
    selectOrThrow("custom games status lookup", supabase.from("custom_games").select("status", { count: "exact" }))
  ]);

  const groupIds = groups.data.map((row) => String(row.id));
  const [groupMembersCount, groupLeaderboardCount] = groupIds.length > 0
    ? await Promise.all([
        countRows("group_members", (query) => query.in("group_id", groupIds)),
        countRows("group_leaderboard_entries", (query) => query.in("group_id", groupIds))
      ])
    : [0, 0];

  const usedPuzzleIds = new Set(
    (await selectOrThrow("used publication puzzle lookup", supabase.from("puzzle_publications").select("puzzle_id"))).data
      .map((row) => String(row.puzzle_id))
  );
  const { data: candidateRows } = await selectOrThrow(
    "candidate pool lookup",
    supabase
      .from("puzzles")
      .select("id,status,quality_score")
      .eq("locale", "ko")
      .in("status", ["generated", "approved"])
      .gte("quality_score", 70)
      .limit(500)
  );
  const unusedCandidateCount = candidateRows.filter((row) => !usedPuzzleIds.has(String(row.id))).length;

  const visibleWinnerMessages = winnerMessages.data
    .filter((row) => row.message_status === "visible")
    .map((row) => ({
      id: String(row.id),
      nickname: String(row.nickname_snapshot),
      visibleUntil: String(row.visible_until),
      ...(showAnswer ? { message: String(row.message) } : {})
    }));

  const report = {
    checkedAt: new Date().toISOString(),
    activeDateKst,
    nextDateKst,
    activePublication: activePublication
      ? {
          id: String(activePublication.id),
          puzzleId: String(activePublication.puzzle_id),
          status: String(activePublication.status),
          scheduledAt: activePublication.scheduled_at,
          publishedAt: activePublication.published_at
        }
      : null,
    activeDatePublications: publicationRows.map((row) => ({
      id: String(row.id),
      puzzleId: String(row.puzzle_id),
      status: String(row.status),
      scheduledAt: row.scheduled_at,
      publishedAt: row.published_at
    })),
    puzzle,
    dailyState: {
      attempts: {
        total: attempts.count,
        byStatus: countBy(attempts.data, "status"),
        ranked: attempts.data.filter((row) => row.is_ranked).length,
        anonymous: attempts.data.filter((row) => !row.user_id && row.anonymous_session_id).length,
        signedIn: attempts.data.filter((row) => row.user_id).length
      },
      leaderboard: {
        total: leaderboardEntries.count,
        byRankStatus: countBy(leaderboardEntries.data, "rank_status"),
        anonymous: leaderboardEntries.data.filter((row) => !row.user_id && row.anonymous_session_id).length,
        signedIn: leaderboardEntries.data.filter((row) => row.user_id).length
      },
      winnerMessages: {
        total: winnerMessages.count,
        byStatus: countBy(winnerMessages.data, "message_status"),
        visible: visibleWinnerMessages
      },
      feedback: {
        total: feedbackRows.count,
        byStatus: countBy(feedbackRows.data, "feedback_status")
      },
      groups: {
        total: groups.count,
        owned: groups.data.filter((row) => row.owner_user_id).length,
        anonymousOwned: groups.data.filter((row) => !row.owner_user_id).length,
        members: groupMembersCount,
        leaderboardEntries: groupLeaderboardCount
      }
    },
    publicationQueue: {
      nextSevenDays: upcoming.data.map((row) => ({
        publishDateKst: String(row.publish_date_kst),
        puzzleId: String(row.puzzle_id),
        status: String(row.status),
        scheduledAt: row.scheduled_at,
        publishedAt: row.published_at
      })),
      unusedGeneratedOrApprovedCandidatesOverQuality70: unusedCandidateCount
    },
    customGames: {
      total: customStatusRows.count,
      byStatus: countBy(customStatusRows.data, "status")
    },
    spoilerPolicy: showAnswer ? "answer_and_clues_included_by_flag" : "answer_and_clues_hidden"
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
