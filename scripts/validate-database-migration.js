#!/usr/bin/env node
import fs from "node:fs/promises";

const CONTRACT_PATH = "schema/database-contract.json";
const MIGRATIONS_DIR = "supabase/migrations";

function normalizeSql(sql) {
  return sql.toLowerCase().replace(/\s+/g, " ");
}

function addIssue(issues, code, detail) {
  issues.push({ code, detail });
}

function includesAll(sql, values, prefix, issues) {
  for (const value of values) {
    if (!sql.includes(value.toLowerCase())) addIssue(issues, prefix, value);
  }
}

async function main() {
  const contract = JSON.parse(await fs.readFile(CONTRACT_PATH, "utf8"));
  const migrationFiles = (await fs.readdir(MIGRATIONS_DIR))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const migration = (await Promise.all(
    migrationFiles.map((fileName) => fs.readFile(`${MIGRATIONS_DIR}/${fileName}`, "utf8"))
  )).join("\n");
  const sql = normalizeSql(migration);
  const issues = [];

  for (const enumName of Object.keys(contract.enums || {})) {
    if (!sql.includes(`create type public.${enumName}`)) {
      addIssue(issues, "missing_enum_type", enumName);
    }
    includesAll(sql, contract.enums[enumName], `missing_enum_value:${enumName}`, issues);
  }

  for (const [tableName, table] of Object.entries(contract.tables || {})) {
    if (!sql.includes(`create table public.${tableName}`)) {
      addIssue(issues, "missing_table", tableName);
      continue;
    }

    for (const columnName of Object.keys(table.columns || {})) {
      if (!sql.includes(columnName.toLowerCase())) {
        addIssue(issues, "missing_column", `${tableName}.${columnName}`);
      }
    }

    if (!sql.includes(`alter table public.${tableName} enable row level security`)) {
      addIssue(issues, "missing_rls_enable", tableName);
    }
  }

  const requiredSnippets = [
    "references auth.users(id)",
    "create trigger auth_users_create_profile",
    "constraint one_publication_per_kst_date unique (publish_date_kst)",
    "constraint one_leaderboard_entry_per_user_publication unique (publication_id, user_id)",
    "create unique index one_visible_or_flagged_ranked_success_per_user",
    "where rank_status in ('visible', 'flagged')",
    "create type public.winner_message_status",
    "create table public.daily_winner_messages",
    "constraint winner_message_length check (char_length(message) between 1 and 100)",
    "create trigger daily_winner_message_requires_rank_one",
    "raise exception 'daily winner message requires the rank 1 leaderboard entry'",
    "grant select (nickname_snapshot, message, visible_until) on public.daily_winner_messages to anon, authenticated",
    "create type public.feedback_status",
    "create table public.daily_puzzle_feedback",
    "constraint one_feedback_per_user_publication unique (publication_id, user_id)",
    "constraint feedback_comment_length check (char_length(comment) between 1 and 140)",
    "create trigger daily_puzzle_feedback_requires_completed_attempt",
    "raise exception 'daily puzzle feedback requires a completed attempt'",
    "grant select (nickname_snapshot, reaction, comment, created_at) on public.daily_puzzle_feedback to authenticated",
    "create unique index if not exists attempts_one_user_attempt_per_publication",
    "where user_id is not null",
    "create unique index if not exists attempts_one_anonymous_attempt_per_publication",
    "where anonymous_session_id is not null",
    "on public.leaderboard_entries ( publication_id, rank_status, used_clue_count, elapsed_ms, submitted_at )",
    "revoke all on public.profiles from anon, authenticated",
    "grant select (id, nickname, avatar_url) on public.profiles to anon, authenticated"
  ];
  includesAll(sql, requiredSnippets, "missing_required_sql", issues);

  const forbiddenPublicGrants = [
    "grant select (email",
    "grant select (submitted_answer",
    "grant select (normalized_answer",
    "grant select (ip_hash",
    "grant select (device_hash",
    "grant select (user_agent_hash"
  ];
  for (const snippet of forbiddenPublicGrants) {
    if (sql.includes(snippet)) addIssue(issues, "forbidden_public_grant", snippet);
  }

  if (issues.length > 0) {
    console.error(`Database migration validation failed: ${issues.length} issue(s).`);
    for (const issue of issues) console.error(`  - ${issue.code}: ${issue.detail}`);
    process.exit(1);
  }

  console.log("Database migration validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
