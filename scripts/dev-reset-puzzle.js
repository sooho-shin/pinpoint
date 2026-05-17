#!/usr/bin/env node
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HISTORY_PATH = "tmp/dev-reset-puzzle-history.json";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function getActivePublicationDateKst(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  const currentKstDateUtcMs = Date.UTC(value("year"), value("month") - 1, value("day"));
  const activeDateUtcMs = value("hour") < 17 ? currentKstDateUtcMs - 24 * 60 * 60 * 1000 : currentKstDateUtcMs;
  return new Date(activeDateUtcMs).toISOString().slice(0, 10);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function readHistory() {
  try {
    const parsed = JSON.parse(await fs.readFile(HISTORY_PATH, "utf8"));
    return Array.isArray(parsed.usedPuzzleIds) ? parsed.usedPuzzleIds.map(String) : [];
  } catch {
    return [];
  }
}

async function writeHistory(usedPuzzleIds) {
  await fs.mkdir("tmp", { recursive: true });
  await fs.writeFile(HISTORY_PATH, `${JSON.stringify({ usedPuzzleIds: [...new Set(usedPuzzleIds)] }, null, 2)}\n`, "utf8");
}

async function countRows(table, buildQuery = (query) => query) {
  const query = buildQuery(supabase.from(table).select("*", { count: "exact", head: true }));
  const { count, error } = await query;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function listIds(table, column, values) {
  if (values.length === 0) return [];
  const { data, error } = await supabase.from(table).select("id").in(column, values);
  if (error) throw new Error(`${table} id lookup failed: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

async function deleteByIds(table, ids) {
  if (ids.length === 0) return 0;
  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
  return ids.length;
}

async function countGroupsForPublication(publicationId) {
  const groupIds = await listIds("groups", "publication_id", [publicationId]);
  if (groupIds.length === 0) {
    return {
      groupIds,
      counts: {
        group_leaderboard_entries: 0,
        group_members: 0,
        groups: 0
      }
    };
  }

  return {
    groupIds,
    counts: {
      group_leaderboard_entries: await countRows("group_leaderboard_entries", (query) => query.in("group_id", groupIds)),
      group_members: await countRows("group_members", (query) => query.in("group_id", groupIds)),
      groups: groupIds.length
    }
  };
}

async function deleteGroupsForPublication(publicationId) {
  const groupCounts = await countGroupsForPublication(publicationId);
  const groupIds = groupCounts.groupIds;
  if (groupIds.length === 0) return groupCounts.counts;

  const { error: groupLeaderboardError } = await supabase
    .from("group_leaderboard_entries")
    .delete()
    .in("group_id", groupIds);
  if (groupLeaderboardError) throw new Error(`group_leaderboard_entries delete failed: ${groupLeaderboardError.message}`);

  const { error: groupMembersError } = await supabase
    .from("group_members")
    .delete()
    .in("group_id", groupIds);
  if (groupMembersError) throw new Error(`group_members delete failed: ${groupMembersError.message}`);

  const deletedGroups = await deleteByIds("groups", groupIds);
  return {
    group_leaderboard_entries: groupCounts.counts.group_leaderboard_entries,
    group_members: groupCounts.counts.group_members,
    groups: deletedGroups
  };
}

async function listAllIds(table) {
  const { data, error } = await supabase.from(table).select("id");
  if (error) throw new Error(`${table} id lookup failed: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth users list failed: ${error.message}`);
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < 1000) break;
  }
  return users;
}

async function deleteAuthUsers() {
  const users = await listAuthUsers();
  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`auth user delete failed for ${user.id}: ${error.message}`);
  }
  return users.length;
}

async function findPublication(publishDateKst) {
  const { data, error } = await supabase
    .from("puzzle_publications")
    .select("id,puzzle_id,publish_date_kst,status")
    .eq("publish_date_kst", publishDateKst)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function choosePuzzle(currentPuzzleId, args, history) {
  if (args["puzzle-id"]) {
    const { data, error } = await supabase
      .from("puzzles")
      .select("id,answer,category,difficulty,clues,status,quality_score,created_at")
      .eq("id", String(args["puzzle-id"]))
      .single();
    if (error) throw error;
    return data;
  }

  const { data: publications, error: publicationError } = await supabase
    .from("puzzle_publications")
    .select("puzzle_id,publish_date_kst,status");
  if (publicationError) throw publicationError;

  const usedByOtherPublication = new Set(
    (publications ?? [])
      .filter((item) => item.puzzle_id !== currentPuzzleId)
      .map((item) => item.puzzle_id)
  );

  const { data: puzzles, error: puzzleError } = await supabase
    .from("puzzles")
    .select("id,answer,category,difficulty,clues,status,quality_score,created_at")
    .eq("locale", "ko")
    .order("created_at", { ascending: false })
    .limit(200);
  if (puzzleError) throw puzzleError;

  const baseCandidates = (puzzles ?? []).filter((puzzle) => (
    puzzle.id !== currentPuzzleId &&
    !usedByOtherPublication.has(puzzle.id) &&
    Number(puzzle.quality_score ?? 0) >= 70
  ));
  const historySet = new Set(history);
  return baseCandidates.find((puzzle) => !historySet.has(puzzle.id)) ?? baseCandidates[0] ?? null;
}

async function resetDerivedState(publicationId, resetAuth) {
  const attemptIds = await listIds("attempts", "publication_id", [publicationId]);
  const leaderboardEntryIds = await listIds("leaderboard_entries", "publication_id", [publicationId]);
  const dailyWinnerMessageIds = await listIds("daily_winner_messages", "publication_id", [publicationId]);
  const dailyPuzzleFeedbackIds = await listIds("daily_puzzle_feedback", "publication_id", [publicationId]);
  const groupDeletes = await deleteGroupsForPublication(publicationId);

  const deletedDailyPuzzleFeedback = await deleteByIds("daily_puzzle_feedback", dailyPuzzleFeedbackIds);
  const deletedDailyWinnerMessages = await deleteByIds("daily_winner_messages", dailyWinnerMessageIds);
  const deletedLeaderboardEntries = await deleteByIds("leaderboard_entries", leaderboardEntryIds);
  const deletedAttempts = await deleteByIds("attempts", attemptIds);

  let deletedProfiles = 0;
  let deletedAuthUsers = 0;
  if (resetAuth) {
    const profileIds = await listAllIds("profiles");
    deletedProfiles = await deleteByIds("profiles", profileIds);
    deletedAuthUsers = await deleteAuthUsers();
  }

  return {
    attempts: deletedAttempts,
    leaderboard_entries: deletedLeaderboardEntries,
    daily_winner_messages: deletedDailyWinnerMessages,
    daily_puzzle_feedback: deletedDailyPuzzleFeedback,
    ...groupDeletes,
    profiles: deletedProfiles,
    auth_users: deletedAuthUsers
  };
}

async function main() {
  const args = parseArgs();
  const dryRun = Boolean(args["dry-run"]);
  const resetAuth = Boolean(args.auth);
  const publishDateKst = args.date ? String(args.date) : getActivePublicationDateKst();
  if (args["clear-history"] && !dryRun) await writeHistory([]);

  const publication = await findPublication(publishDateKst);

  const history = args["clear-history"] ? [] : await readHistory();
  const selectedPuzzle = await choosePuzzle(publication?.puzzle_id ?? null, args, history);
  if (!selectedPuzzle) throw new Error("No available replacement puzzle found.");

  const groupCounts = publication
    ? await countGroupsForPublication(publication.id)
    : { groupIds: [], counts: { group_leaderboard_entries: 0, group_members: 0, groups: 0 } };
  const attemptIds = publication ? await listIds("attempts", "publication_id", [publication.id]) : [];
  const leaderboardEntryIds = publication ? await listIds("leaderboard_entries", "publication_id", [publication.id]) : [];
  const dailyWinnerMessageIds = publication ? await listIds("daily_winner_messages", "publication_id", [publication.id]) : [];
  const dailyPuzzleFeedbackIds = publication ? await listIds("daily_puzzle_feedback", "publication_id", [publication.id]) : [];
  const profileIds = resetAuth ? await listAllIds("profiles") : [];
  const authUsers = resetAuth ? await listAuthUsers() : [];

  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      publishDateKst,
      currentPublication: publication,
      willCreatePublication: !publication,
      nextPuzzle: selectedPuzzle,
      wouldDelete: {
        attempts: attemptIds.length,
        leaderboard_entries: leaderboardEntryIds.length,
        daily_winner_messages: dailyWinnerMessageIds.length,
        daily_puzzle_feedback: dailyPuzzleFeedbackIds.length,
        ...groupCounts.counts,
        profiles: profileIds.length,
        auth_users: authUsers.length
      }
    }, null, 2));
    return;
  }

  const now = new Date().toISOString();
  const { error: puzzleError } = await supabase
    .from("puzzles")
    .update({ status: "generated", reviewed_at: now })
    .eq("id", selectedPuzzle.id);
  if (puzzleError) throw puzzleError;

  const publicationPayload = {
    puzzle_id: selectedPuzzle.id,
    publish_date_kst: publishDateKst,
    status: "published",
    scheduled_at: now,
    published_at: now
  };
  const publicationQuery = publication
    ? supabase
      .from("puzzle_publications")
      .update(publicationPayload)
      .eq("id", publication.id)
      .select("id,puzzle_id,publish_date_kst,status,published_at")
      .single()
    : supabase
      .from("puzzle_publications")
      .insert(publicationPayload)
      .select("id,puzzle_id,publish_date_kst,status,published_at")
      .single();
  const { data: updatedPublication, error: publicationError } = await publicationQuery;
  if (publicationError) throw publicationError;

  const deleted = publication
    ? await resetDerivedState(publication.id, resetAuth)
    : {
      attempts: 0,
      leaderboard_entries: 0,
      daily_winner_messages: 0,
      daily_puzzle_feedback: 0,
      group_leaderboard_entries: 0,
      group_members: 0,
      groups: 0,
      profiles: 0,
      auth_users: 0
    };
  await writeHistory([...(publication?.puzzle_id ? [publication.puzzle_id] : []), selectedPuzzle.id, ...history].slice(0, 100));

  console.log(JSON.stringify({
    publishDateKst,
    publication: updatedPublication,
    previousPuzzleId: publication?.puzzle_id ?? null,
    nextPuzzle: {
      id: selectedPuzzle.id,
      answer: selectedPuzzle.answer,
      category: selectedPuzzle.category,
      clues: selectedPuzzle.clues
    },
    deleted,
    preserved: {
      puzzles: await countRows("puzzles"),
      puzzle_publications: await countRows("puzzle_publications")
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
