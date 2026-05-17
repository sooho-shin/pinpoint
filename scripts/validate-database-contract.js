#!/usr/bin/env node
import fs from "node:fs/promises";

const CONTRACT_PATH = "schema/database-contract.json";

const REQUIRED_TABLES = [
  "profiles",
  "puzzles",
  "puzzle_publications",
  "attempts",
  "leaderboard_entries",
  "daily_winner_messages",
  "daily_puzzle_feedback",
  "groups",
  "group_members",
  "group_leaderboard_entries"
];

const REQUIRED_ENUMS = {
  puzzle_status: ["generated", "approved", "rejected"],
  publication_status: ["scheduled", "published", "canceled"],
  attempt_status: ["playing", "succeeded", "failed", "abandoned"],
  visibility: ["private", "daily", "group"],
  rank_status: ["visible", "flagged", "hidden"],
  winner_message_status: ["draft", "visible", "hidden"],
  feedback_status: ["visible", "hidden"]
};

const REQUIRED_COLUMNS = {
  profiles: ["id", "nickname", "nickname_normalized", "created_at", "updated_at"],
  puzzles: ["id", "locale", "answer", "aliases", "category", "difficulty", "clues", "status", "quality_score", "issue_flags"],
  puzzle_publications: ["id", "puzzle_id", "publish_date_kst", "status", "scheduled_at", "published_at"],
  attempts: [
    "id",
    "publication_id",
    "user_id",
    "anonymous_session_id",
    "started_at",
    "submitted_at",
    "elapsed_ms",
    "used_clue_count",
    "submitted_answer",
    "normalized_answer",
    "is_correct",
    "status",
    "is_ranked",
    "visibility",
    "flagged",
    "device_hash",
    "ip_hash",
    "user_agent_hash"
  ],
  leaderboard_entries: [
    "id",
    "publication_id",
    "user_id",
    "attempt_id",
    "nickname_snapshot",
    "used_clue_count",
    "elapsed_ms",
    "submitted_at",
    "rank_status"
  ],
  daily_winner_messages: [
    "id",
    "publication_id",
    "leaderboard_entry_id",
    "user_id",
    "nickname_snapshot",
    "message",
    "message_status",
    "visible_from",
    "visible_until",
    "created_at",
    "updated_at"
  ],
  daily_puzzle_feedback: [
    "id",
    "publication_id",
    "user_id",
    "attempt_id",
    "nickname_snapshot",
    "reaction",
    "comment",
    "feedback_status",
    "created_at",
    "updated_at"
  ],
  groups: ["id", "owner_user_id", "publication_id", "invite_code", "created_at"],
  group_members: ["group_id", "user_id", "joined_at"],
  group_leaderboard_entries: ["group_id", "leaderboard_entry_id", "created_at"]
};

const PUBLIC_FORBIDDEN_COLUMNS = new Set([
  "email",
  "submitted_answer",
  "normalized_answer",
  "ip_hash",
  "device_hash",
  "user_agent_hash"
]);

function addIssue(issues, code, detail) {
  issues.push({ code, detail });
}

function hasColumns(table, columns) {
  return columns.every((column) => Object.hasOwn(table.columns || {}, column));
}

function hasConstraint(table, type, columns) {
  return (table.constraints || []).some((constraint) => {
    if (constraint.type !== type) return false;
    const actual = constraint.columns || [];
    return columns.length === actual.length && columns.every((column, index) => actual[index] === column);
  });
}

function hasIndex(table, predicate) {
  return (table.indexes || []).some(predicate);
}

function validateEnums(contract, issues) {
  for (const [name, requiredValues] of Object.entries(REQUIRED_ENUMS)) {
    const values = contract.enums?.[name];
    if (!Array.isArray(values)) {
      addIssue(issues, "missing_enum", name);
      continue;
    }
    for (const value of requiredValues) {
      if (!values.includes(value)) addIssue(issues, "missing_enum_value", `${name}.${value}`);
    }
  }
}

function validateTables(contract, issues) {
  const tables = contract.tables || {};
  for (const tableName of REQUIRED_TABLES) {
    const table = tables[tableName];
    if (!table) {
      addIssue(issues, "missing_table", tableName);
      continue;
    }

    const missingColumns = REQUIRED_COLUMNS[tableName].filter((column) => !Object.hasOwn(table.columns || {}, column));
    for (const column of missingColumns) addIssue(issues, "missing_column", `${tableName}.${column}`);

    if (!table.rls?.required) addIssue(issues, "rls_not_required", tableName);
  }
}

function validateSeparation(contract, issues) {
  const tables = contract.tables || {};
  if (!tables.puzzles || !tables.puzzle_publications) return;

  for (const column of ["scheduled_at", "published_at", "publish_date_kst"]) {
    if (Object.hasOwn(tables.puzzles.columns || {}, column)) {
      addIssue(issues, "publication_field_on_puzzles", `puzzles.${column}`);
    }
  }

  if (!tables.puzzle_publications.columns?.puzzle_id?.references?.startsWith("puzzles.")) {
    addIssue(issues, "publication_missing_puzzle_reference", "puzzle_publications.puzzle_id");
  }
}

function validateAuthAndPrivacy(contract, issues) {
  const tables = contract.tables || {};
  const profiles = tables.profiles;
  if (!profiles) return;

  if (!profiles.columns?.id?.references?.startsWith("auth.users.")) {
    addIssue(issues, "profile_missing_auth_reference", "profiles.id");
  }

  if (Object.hasOwn(profiles.columns || {}, "email")) {
    addIssue(issues, "email_column_on_public_profile", "profiles.email");
  }

  for (const [tableName, table] of Object.entries(tables)) {
    for (const [columnName, column] of Object.entries(table.columns || {})) {
      if (PUBLIC_FORBIDDEN_COLUMNS.has(columnName) && column.public === true) {
        addIssue(issues, "forbidden_public_column", `${tableName}.${columnName}`);
      }
    }
  }

  const forbiddenApiColumns = contract.apiRequirements?.publicRankingMustNotExposeColumns || [];
  for (const column of PUBLIC_FORBIDDEN_COLUMNS) {
    if (!forbiddenApiColumns.includes(column)) {
      addIssue(issues, "public_api_forbidden_column_not_declared", column);
    }
  }
}

function validateLeaderboard(contract, issues) {
  const leaderboard = contract.tables?.leaderboard_entries;
  const attempts = contract.tables?.attempts;
  if (!leaderboard || !attempts) return;

  if (!hasColumns(leaderboard, ["publication_id", "user_id", "attempt_id", "used_clue_count", "elapsed_ms", "submitted_at", "rank_status"])) {
    addIssue(issues, "leaderboard_missing_sort_or_identity_columns", "leaderboard_entries");
  }

  if (!hasColumns(attempts, ["publication_id", "user_id", "is_correct", "is_ranked", "flagged"])) {
    addIssue(issues, "attempts_missing_ranking_source_columns", "attempts");
  }

  if (!hasConstraint(leaderboard, "unique", ["publication_id", "user_id"])) {
    addIssue(issues, "missing_one_ranked_entry_constraint", "leaderboard_entries(publication_id,user_id)");
  }

  const hasPartialRankIndex = hasIndex(leaderboard, (index) => (
    index.unique === true &&
    Array.isArray(index.columns) &&
    index.columns.join(",") === "publication_id,user_id" &&
    typeof index.partialWhere === "string" &&
    index.partialWhere.includes("visible") &&
    index.partialWhere.includes("flagged")
  ));
  if (!hasPartialRankIndex) {
    addIssue(issues, "missing_partial_ranked_success_index", "leaderboard_entries");
  }

  const expectedSort = ["used_clue_count", "elapsed_ms", "submitted_at"];
  const actualSort = leaderboard.rankingSort || [];
  if (expectedSort.join(",") !== actualSort.join(",")) {
    addIssue(issues, "invalid_leaderboard_sort", `expected ${expectedSort.join(" -> ")}`);
  }

  const apiSort = (contract.apiRequirements?.dailyRankingOrder || []).map((item) => `${item.column}:${item.direction}`);
  const expectedApiSort = expectedSort.map((column) => `${column}:asc`);
  if (expectedApiSort.join(",") !== apiSort.join(",")) {
    addIssue(issues, "invalid_api_ranking_sort", `expected ${expectedApiSort.join(" -> ")}`);
  }
}

function validateDailyWinnerMessages(contract, issues) {
  const messages = contract.tables?.daily_winner_messages;
  if (!messages) return;

  if (!messages.columns?.publication_id?.references?.startsWith("puzzle_publications.")) {
    addIssue(issues, "winner_message_missing_publication_reference", "daily_winner_messages.publication_id");
  }

  if (!messages.columns?.leaderboard_entry_id?.references?.startsWith("leaderboard_entries.")) {
    addIssue(issues, "winner_message_missing_leaderboard_reference", "daily_winner_messages.leaderboard_entry_id");
  }

  if (!messages.columns?.user_id?.references?.startsWith("profiles.")) {
    addIssue(issues, "winner_message_missing_profile_reference", "daily_winner_messages.user_id");
  }

  if (Number(messages.columns?.message?.maxLength) !== 100) {
    addIssue(issues, "winner_message_max_length_mismatch", "daily_winner_messages.message");
  }

  if (!hasConstraint(messages, "unique", ["publication_id"])) {
    addIssue(issues, "missing_one_winner_message_per_publication_constraint", "daily_winner_messages(publication_id)");
  }

  const hasVisibleMessageIndex = hasIndex(messages, (index) => (
    index.unique === true &&
    Array.isArray(index.columns) &&
    index.columns.join(",") === "publication_id" &&
    typeof index.partialWhere === "string" &&
    index.partialWhere.includes("message_status") &&
    index.partialWhere.includes("visible")
  ));
  if (!hasVisibleMessageIndex) {
    addIssue(issues, "missing_visible_winner_message_unique_index", "daily_winner_messages");
  }

  const rankAuthorization = messages.rankAuthorization || {};
  if (rankAuthorization.requiresLeaderboardRank !== 1) {
    addIssue(issues, "winner_message_must_require_rank_one", "daily_winner_messages.rankAuthorization.requiresLeaderboardRank");
  }
  const expectedRankOrder = ["used_clue_count", "elapsed_ms", "submitted_at"];
  const actualRankOrder = rankAuthorization.rankOrder || [];
  if (actualRankOrder.join(",") !== expectedRankOrder.join(",")) {
    addIssue(issues, "winner_message_rank_order_mismatch", `expected ${expectedRankOrder.join(" -> ")}`);
  }
  if (rankAuthorization.enforcedBy !== "trigger:daily_winner_message_requires_rank_one") {
    addIssue(issues, "winner_message_missing_rank_one_trigger_contract", "daily_winner_messages.rankAuthorization.enforcedBy");
  }

  const apiContract = contract.apiRequirements?.dailyWinnerMessage;
  if (!apiContract) {
    addIssue(issues, "missing_daily_winner_message_api_contract", "apiRequirements.dailyWinnerMessage");
    return;
  }

  if (Number(apiContract.maxLength) !== 100) {
    addIssue(issues, "daily_winner_message_api_max_length_mismatch", "apiRequirements.dailyWinnerMessage.maxLength");
  }
  if (apiContract.requiresDailyRank !== 1) {
    addIssue(issues, "daily_winner_message_requires_rank_one", "apiRequirements.dailyWinnerMessage.requiresDailyRank");
  }
  if (apiContract.visibleUntilNextPublication !== true) {
    addIssue(issues, "daily_winner_message_missing_next_publication_expiry", "apiRequirements.dailyWinnerMessage.visibleUntilNextPublication");
  }

  const allowedPublicFields = ["nickname_snapshot", "message", "visible_until"];
  const publicFields = apiContract.publicFields || [];
  for (const field of allowedPublicFields) {
    if (!publicFields.includes(field)) addIssue(issues, "daily_winner_message_missing_public_field", field);
  }
  for (const field of publicFields) {
    if (!allowedPublicFields.includes(field)) addIssue(issues, "daily_winner_message_forbidden_public_field", field);
  }
}

function validateDailyPuzzleFeedback(contract, issues) {
  const feedback = contract.tables?.daily_puzzle_feedback;
  if (!feedback) return;

  if (!feedback.columns?.publication_id?.references?.startsWith("puzzle_publications.")) {
    addIssue(issues, "feedback_missing_publication_reference", "daily_puzzle_feedback.publication_id");
  }

  if (!feedback.columns?.user_id?.references?.startsWith("profiles.")) {
    addIssue(issues, "feedback_missing_profile_reference", "daily_puzzle_feedback.user_id");
  }

  if (!feedback.columns?.attempt_id?.references?.startsWith("attempts.")) {
    addIssue(issues, "feedback_missing_attempt_reference", "daily_puzzle_feedback.attempt_id");
  }

  if (Number(feedback.columns?.comment?.maxLength) !== 140) {
    addIssue(issues, "feedback_comment_max_length_mismatch", "daily_puzzle_feedback.comment");
  }

  if (!hasConstraint(feedback, "unique", ["publication_id", "user_id"])) {
    addIssue(issues, "missing_one_feedback_per_user_publication_constraint", "daily_puzzle_feedback(publication_id,user_id)");
  }

  const completionAuthorization = feedback.completionAuthorization || {};
  if (completionAuthorization.requiresCompletedAttempt !== true) {
    addIssue(issues, "feedback_must_require_completed_attempt", "daily_puzzle_feedback.completionAuthorization.requiresCompletedAttempt");
  }
  if (completionAuthorization.enforcedBy !== "trigger:daily_puzzle_feedback_requires_completed_attempt") {
    addIssue(issues, "feedback_missing_completed_attempt_trigger_contract", "daily_puzzle_feedback.completionAuthorization.enforcedBy");
  }

  const apiContract = contract.apiRequirements?.dailyPuzzleFeedback;
  if (!apiContract) {
    addIssue(issues, "missing_daily_puzzle_feedback_api_contract", "apiRequirements.dailyPuzzleFeedback");
    return;
  }

  if (Number(apiContract.maxCommentLength) !== 140) {
    addIssue(issues, "daily_puzzle_feedback_api_comment_length_mismatch", "apiRequirements.dailyPuzzleFeedback.maxCommentLength");
  }
  if (apiContract.requiresCompletedAttemptToRead !== true) {
    addIssue(issues, "daily_puzzle_feedback_must_require_completion_to_read", "apiRequirements.dailyPuzzleFeedback.requiresCompletedAttemptToRead");
  }
  if (apiContract.requiresCompletedAttemptToWrite !== true) {
    addIssue(issues, "daily_puzzle_feedback_must_require_completion_to_write", "apiRequirements.dailyPuzzleFeedback.requiresCompletedAttemptToWrite");
  }

  const allowedPublicFields = ["nickname_snapshot", "reaction", "comment", "created_at"];
  const publicFields = apiContract.publicFields || [];
  for (const field of allowedPublicFields) {
    if (!publicFields.includes(field)) addIssue(issues, "daily_puzzle_feedback_missing_public_field", field);
  }
  for (const field of publicFields) {
    if (!allowedPublicFields.includes(field)) addIssue(issues, "daily_puzzle_feedback_forbidden_public_field", field);
  }
}

function validateGroups(contract, issues) {
  const groups = contract.tables?.groups;
  const members = contract.tables?.group_members;
  const groupEntries = contract.tables?.group_leaderboard_entries;
  if (!groups || !members || !groupEntries) return;

  if (!groups.columns?.publication_id?.references?.startsWith("puzzle_publications.")) {
    addIssue(issues, "group_missing_publication_reference", "groups.publication_id");
  }

  if (!hasConstraint(members, "primary", ["group_id", "user_id"])) {
    addIssue(issues, "missing_group_members_primary_key", "group_members(group_id,user_id)");
  }

  if (!hasConstraint(groupEntries, "primary", ["group_id", "leaderboard_entry_id"])) {
    addIssue(issues, "missing_group_leaderboard_primary_key", "group_leaderboard_entries(group_id,leaderboard_entry_id)");
  }
}

function validatePublications(contract, issues) {
  const publications = contract.tables?.puzzle_publications;
  if (!publications) return;

  if (!hasConstraint(publications, "unique", ["publish_date_kst"])) {
    addIssue(issues, "missing_one_publication_per_day_constraint", "puzzle_publications.publish_date_kst");
  }
}

function validateUserScopedPlayModel(contract, issues) {
  const api = contract.apiRequirements || {};
  const expected = {
    dailyPublicationScope: "one_published_puzzle_per_kst_date",
    activePublicationWindowKst: "17:00_to_next_day_17:00",
    anonymousPlayAllowed: true,
    attemptScope: "publication_id+(user_id|anonymous_session_id)",
    anonymousAttemptClaimedAfterSignin: true,
    terminalAnonymousAttemptPreventsSigninReplay: true,
    allAuthenticatedUsersCanPlaySamePublication: true,
    allAnonymousSessionsCanPlaySamePublication: true,
    leaderboardDoesNotLockPlay: true,
    winnerDoesNotLockPlay: true
  };

  for (const [key, value] of Object.entries(expected)) {
    if (api[key] !== value) {
      addIssue(issues, "user_scoped_play_model_mismatch", `${key}: expected ${value}`);
    }
  }

  const attempts = contract.tables?.attempts;
  if (!attempts) return;

  const hasUserUnique = hasIndex(attempts, (index) => (
    index.unique === true &&
    Array.isArray(index.columns) &&
    index.columns.join(",") === "publication_id,user_id" &&
    typeof index.partialWhere === "string" &&
    index.partialWhere.includes("user_id is not null")
  ));
  if (!hasUserUnique) {
    addIssue(issues, "missing_one_user_attempt_per_publication_index", "attempts(publication_id,user_id)");
  }

  const hasAnonymousUnique = hasIndex(attempts, (index) => (
    index.unique === true &&
    Array.isArray(index.columns) &&
    index.columns.join(",") === "publication_id,anonymous_session_id" &&
    typeof index.partialWhere === "string" &&
    index.partialWhere.includes("anonymous_session_id is not null")
  ));
  if (!hasAnonymousUnique) {
    addIssue(issues, "missing_one_anonymous_attempt_per_publication_index", "attempts(publication_id,anonymous_session_id)");
  }
}

async function main() {
  const raw = await fs.readFile(CONTRACT_PATH, "utf8");
  const contract = JSON.parse(raw);
  const issues = [];

  if (contract.version !== 1) addIssue(issues, "invalid_contract_version", String(contract.version));
  if (contract.database?.engine !== "postgresql") addIssue(issues, "invalid_database_engine", contract.database?.engine || "(missing)");
  if (contract.database?.authProvider !== "google-oauth") addIssue(issues, "invalid_auth_provider", contract.database?.authProvider || "(missing)");

  validateEnums(contract, issues);
  validateTables(contract, issues);
  validateSeparation(contract, issues);
  validateAuthAndPrivacy(contract, issues);
  validatePublications(contract, issues);
  validateUserScopedPlayModel(contract, issues);
  validateLeaderboard(contract, issues);
  validateDailyWinnerMessages(contract, issues);
  validateDailyPuzzleFeedback(contract, issues);
  validateGroups(contract, issues);

  if (issues.length > 0) {
    console.error(`Database contract validation failed: ${issues.length} issue(s).`);
    for (const issue of issues) console.error(`  - ${issue.code}: ${issue.detail}`);
    process.exit(1);
  }

  console.log(`Database contract validation passed: ${REQUIRED_TABLES.length} table(s), ${Object.keys(REQUIRED_ENUMS).length} enum(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
