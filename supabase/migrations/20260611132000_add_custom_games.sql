-- Add anonymous nickname ranking support and custom shareable games.

create type public.custom_game_status as enum (
  'active',
  'hidden',
  'deleted'
);

alter table public.leaderboard_entries
  alter column user_id drop not null,
  add column anonymous_session_id text,
  add constraint leaderboard_user_or_anonymous_required
    check (user_id is not null or anonymous_session_id is not null);

create unique index one_visible_or_flagged_ranked_success_per_anonymous_session
  on public.leaderboard_entries (publication_id, anonymous_session_id)
  where anonymous_session_id is not null and rank_status in ('visible', 'flagged');

create table public.custom_games (
  id uuid primary key default gen_random_uuid(),
  creator_anonymous_session_id text not null,
  play_slug text not null,
  admin_token_hash text not null,
  answer text not null,
  aliases text[] not null default '{}',
  clues jsonb not null,
  normalized_answer text not null,
  status public.custom_game_status not null default 'active',
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_games_play_slug_unique unique (play_slug),
  constraint custom_games_admin_token_hash_unique unique (admin_token_hash),
  constraint custom_games_answer_length check (char_length(answer) between 1 and 40),
  constraint custom_games_clues_has_5_items check (jsonb_typeof(clues) = 'array' and jsonb_array_length(clues) = 5),
  constraint custom_games_report_count_non_negative check (report_count >= 0)
);

create table public.custom_game_attempts (
  id uuid primary key default gen_random_uuid(),
  custom_game_id uuid not null references public.custom_games(id) on delete cascade,
  anonymous_session_id text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  elapsed_ms integer,
  used_clue_count integer,
  submitted_answer text,
  normalized_answer text,
  is_correct boolean not null default false,
  status public.attempt_status not null default 'playing',
  is_ranked boolean not null default false,
  nickname_snapshot text,
  rank_status public.rank_status not null default 'visible',
  created_at timestamptz not null default now(),
  constraint one_custom_attempt_per_anonymous_session unique (custom_game_id, anonymous_session_id),
  constraint custom_attempt_used_clue_count_range check (used_clue_count is null or used_clue_count between 1 and 5),
  constraint custom_attempt_elapsed_ms_non_negative check (elapsed_ms is null or elapsed_ms >= 0),
  constraint custom_attempt_nickname_length check (nickname_snapshot is null or char_length(nickname_snapshot) between 2 and 12)
);

create table public.custom_game_reports (
  id uuid primary key default gen_random_uuid(),
  custom_game_id uuid not null references public.custom_games(id) on delete cascade,
  anonymous_session_id text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint one_custom_report_per_session unique (custom_game_id, anonymous_session_id),
  constraint custom_report_reason_length check (char_length(reason) between 1 and 160)
);

create index custom_games_status_created_idx
  on public.custom_games (status, created_at);

create index custom_games_creator_created_idx
  on public.custom_games (creator_anonymous_session_id, created_at);

create index custom_attempts_lookup_idx
  on public.custom_game_attempts (custom_game_id, anonymous_session_id);

create index custom_attempts_rank_sort_idx
  on public.custom_game_attempts (
    custom_game_id,
    rank_status,
    used_clue_count,
    elapsed_ms,
    submitted_at
  );

create index custom_reports_game_idx
  on public.custom_game_reports (custom_game_id, created_at);

create trigger custom_games_set_updated_at
  before update on public.custom_games
  for each row execute function public.set_updated_at();

alter table public.custom_games enable row level security;
alter table public.custom_game_attempts enable row level security;
alter table public.custom_game_reports enable row level security;

revoke all on public.custom_games from anon, authenticated;
revoke all on public.custom_game_attempts from anon, authenticated;
revoke all on public.custom_game_reports from anon, authenticated;
