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

function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
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
  const publishDateKst = args.date ? String(args.date) : getKstDateString();
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
        ...groupCounts.counts,
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
  const deletedAttempts = await deleteByIds("attempts", attemptIds);

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
      ...groupDeletes,
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
