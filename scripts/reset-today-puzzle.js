#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function countRows(table, buildQuery = (query) => query) {
  const query = buildQuery(supabase.from(table).select("*", { count: "exact", head: true }));
  const { count, error } = await query;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function deleteByIds(table, ids) {
  if (ids.length === 0) return 0;
  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
  return ids.length;
}

async function listIds(table, column, values) {
  if (values.length === 0) return [];
  const { data, error } = await supabase.from(table).select("id").in(column, values);
  if (error) throw new Error(`${table} id lookup failed: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

function addKstDate(dateText, days) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function computeUserStreak(results) {
  const ordered = [...results].sort((a, b) => String(a.publish_date_kst).localeCompare(String(b.publish_date_kst)));
  let currentSuccessRun = 0;
  let longestStreak = 0;
  let totalSuccessCount = 0;
  let previousSuccessDate = null;
  let lastSuccessPublishDateKst = null;
  let lastResultPublishDateKst = null;

  for (const result of ordered) {
    const publishDateKst = String(result.publish_date_kst);
    lastResultPublishDateKst = publishDateKst;

    if (!result.succeeded) {
      currentSuccessRun = 0;
      previousSuccessDate = null;
      continue;
    }

    totalSuccessCount += 1;
    currentSuccessRun = previousSuccessDate && addKstDate(previousSuccessDate, 1) === publishDateKst
      ? currentSuccessRun + 1
      : 1;
    longestStreak = Math.max(longestStreak, currentSuccessRun);
    previousSuccessDate = publishDateKst;
    lastSuccessPublishDateKst = publishDateKst;
  }

  const latestResult = ordered.at(-1);
  return {
    current_streak: latestResult?.succeeded ? currentSuccessRun : 0,
    longest_streak: longestStreak,
    total_success_count: totalSuccessCount,
    last_success_publish_date_kst: lastSuccessPublishDateKst,
    last_result_publish_date_kst: lastResultPublishDateKst
  };
}

async function listAffectedUserIds(publicationId) {
  const { data: attempts, error: attemptError } = await supabase
    .from("attempts")
    .select("user_id")
    .eq("publication_id", publicationId)
    .not("user_id", "is", null);
  if (attemptError) throw new Error(`attempts affected users lookup failed: ${attemptError.message}`);

  const { data: dailyResults, error: dailyResultError } = await supabase
    .from("user_daily_results")
    .select("user_id")
    .eq("publication_id", publicationId);
  if (dailyResultError) throw new Error(`user_daily_results affected users lookup failed: ${dailyResultError.message}`);

  return [...new Set([
    ...(attempts ?? []).map((row) => row.user_id).filter(Boolean),
    ...(dailyResults ?? []).map((row) => row.user_id).filter(Boolean)
  ])];
}

async function recomputeUserStreak(userId) {
  const { data, error } = await supabase
    .from("user_daily_results")
    .select("publish_date_kst,succeeded")
    .eq("user_id", userId)
    .order("publish_date_kst", { ascending: true });
  if (error) throw new Error(`user_daily_results streak lookup failed: ${error.message}`);

  const streak = computeUserStreak(data ?? []);
  const { error: upsertError } = await supabase
    .from("user_streaks")
    .upsert({
      user_id: userId,
      ...streak
    }, {
      onConflict: "user_id"
    });
  if (upsertError) throw new Error(`user_streaks recompute failed: ${upsertError.message}`);
}

async function recomputeUserStreaks(userIds) {
  for (const userId of userIds) {
    await recomputeUserStreak(userId);
  }
  return userIds.length;
}

async function listAllIds(table) {
  const { data, error } = await supabase.from(table).select("id");
  if (error) throw new Error(`${table} id lookup failed: ${error.message}`);
  return (data ?? []).map((row) => row.id);
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

async function main() {
  const args = parseArgs();
  const publishDateKst = args.date ? String(args.date) : getActivePublicationDateKst();
  const resetAuth = Boolean(args.auth);
  const dryRun = Boolean(args["dry-run"]);

  const { data: publication, error: publicationError } = await supabase
    .from("puzzle_publications")
    .select("id,puzzle_id,publish_date_kst,status")
    .eq("publish_date_kst", publishDateKst)
    .eq("status", "published")
    .maybeSingle();
  if (publicationError) throw publicationError;
  if (!publication) {
    throw new Error(`No published puzzle_publications row found for ${publishDateKst}.`);
  }

  const publicationId = publication.id;
  const attemptIds = await listIds("attempts", "publication_id", [publicationId]);
  const leaderboardEntryIds = await listIds("leaderboard_entries", "publication_id", [publicationId]);
  const dailyWinnerMessageIds = await listIds("daily_winner_messages", "publication_id", [publicationId]);
  const dailyPuzzleFeedbackIds = await listIds("daily_puzzle_feedback", "publication_id", [publicationId]);
  const userDailyResultIds = await listIds("user_daily_results", "publication_id", [publicationId]);
  const affectedUserIds = await listAffectedUserIds(publicationId);

  if (dryRun) {
    const groupCounts = await countGroupsForPublication(publicationId);
    const profileIds = resetAuth ? await listAllIds("profiles") : [];
    const authUsers = resetAuth ? await listAuthUsers() : [];
    console.log(JSON.stringify({
      dryRun: true,
      publishDateKst,
      publication: {
        id: publication.id,
        puzzleId: publication.puzzle_id,
        status: publication.status
      },
      wouldDelete: {
        attempts: attemptIds.length,
        leaderboard_entries: leaderboardEntryIds.length,
        daily_winner_messages: dailyWinnerMessageIds.length,
        daily_puzzle_feedback: dailyPuzzleFeedbackIds.length,
        user_daily_results: userDailyResultIds.length,
        ...groupCounts.counts,
        user_streaks_recomputed: resetAuth ? 0 : affectedUserIds.length,
        profiles: profileIds.length,
        auth_users: authUsers.length
      },
      preserved: {
        puzzles: await countRows("puzzles"),
        puzzle_publications: await countRows("puzzle_publications")
      }
    }, null, 2));
    return;
  }

  const groupDeletes = await deleteGroupsForPublication(publicationId);

  const deletedDailyPuzzleFeedback = await deleteByIds("daily_puzzle_feedback", dailyPuzzleFeedbackIds);
  const deletedDailyWinnerMessages = await deleteByIds("daily_winner_messages", dailyWinnerMessageIds);
  const deletedLeaderboardEntries = await deleteByIds("leaderboard_entries", leaderboardEntryIds);
  const deletedUserDailyResults = await deleteByIds("user_daily_results", userDailyResultIds);
  const deletedAttempts = await deleteByIds("attempts", attemptIds);
  const recomputedUserStreaks = resetAuth ? 0 : await recomputeUserStreaks(affectedUserIds);

  let deletedProfiles = 0;
  let deletedAuthUsers = 0;
  if (resetAuth) {
    const profileIds = await listAllIds("profiles");
    deletedProfiles = await deleteByIds("profiles", profileIds);
    deletedAuthUsers = await deleteAuthUsers();
  }

  const summary = {
    publishDateKst,
    publication: {
      id: publication.id,
      puzzleId: publication.puzzle_id,
      status: publication.status
    },
    deleted: {
      attempts: deletedAttempts,
      leaderboard_entries: deletedLeaderboardEntries,
      daily_winner_messages: deletedDailyWinnerMessages,
      daily_puzzle_feedback: deletedDailyPuzzleFeedback,
      user_daily_results: deletedUserDailyResults,
      ...groupDeletes,
      user_streaks_recomputed: recomputedUserStreaks,
      profiles: deletedProfiles,
      auth_users: deletedAuthUsers
    },
    preserved: {
      puzzles: await countRows("puzzles"),
      puzzle_publications: await countRows("puzzle_publications")
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
