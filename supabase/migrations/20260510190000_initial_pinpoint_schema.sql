-- Korean Pinpoint initial database schema.
-- Target: Supabase Postgres.

create extension if not exists pgcrypto;

create type public.puzzle_status as enum (
  'generated',
  'approved',
  'rejected',
  'archived'
);

create type public.publication_status as enum (
  'scheduled',
  'published',
  'canceled'
);

create type public.attempt_status as enum (
  'playing',
  'succeeded',
  'failed',
  'abandoned'
);

create type public.visibility as enum (
  'private',
  'daily',
  'group'
);

create type public.rank_status as enum (
  'visible',
  'flagged',
  'hidden'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  nickname_normalized text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(nickname) between 2 and 12)
);

create table public.puzzles (
  id text primary key,
  locale text not null default 'ko',
  answer text not null,
  aliases text[] not null default '{}',
  category text not null,
  difficulty integer not null,
  clues jsonb not null,
  rationale text,
  status public.puzzle_status not null default 'generated',
  quality_score integer,
  issue_flags text[] not null default '{}',
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint puzzles_difficulty_range check (difficulty between 1 and 5),
  constraint puzzles_quality_score_range check (quality_score is null or quality_score between 0 and 100),
  constraint puzzles_clues_has_5_items check (jsonb_typeof(clues) = 'array' and jsonb_array_length(clues) = 5)
);

create table public.puzzle_publications (
  id uuid primary key default gen_random_uuid(),
  puzzle_id text not null references public.puzzles(id) on delete restrict,
  publish_date_kst date not null,
  status public.publication_status not null default 'scheduled',
  scheduled_at timestamptz not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_publication_per_kst_date unique (publish_date_kst),
  constraint one_publication_per_puzzle unique (puzzle_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.puzzle_publications(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_session_id text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  elapsed_ms integer,
  used_clue_count integer,
  submitted_answer text,
  normalized_answer text,
  is_correct boolean not null default false,
  status public.attempt_status not null default 'playing',
  is_ranked boolean not null default false,
  visibility public.visibility not null default 'private',
  flagged boolean not null default false,
  flag_reason text,
  device_hash text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  constraint attempts_used_clue_count_range check (used_clue_count is null or used_clue_count between 1 and 5),
  constraint attempts_elapsed_ms_non_negative check (elapsed_ms is null or elapsed_ms >= 0),
  constraint attempts_user_or_anonymous_session_required check (user_id is not null or anonymous_session_id is not null)
);

create table public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.puzzle_publications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  nickname_snapshot text not null,
  used_clue_count integer not null,
  elapsed_ms integer not null,
  submitted_at timestamptz not null,
  rank_status public.rank_status not null default 'visible',
  created_at timestamptz not null default now(),
  constraint one_leaderboard_entry_per_user_publication unique (publication_id, user_id),
  constraint leaderboard_attempt_unique unique (attempt_id),
  constraint leaderboard_used_clue_count_range check (used_clue_count between 1 and 5),
  constraint leaderboard_elapsed_ms_non_negative check (elapsed_ms >= 0)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  publication_id uuid not null references public.puzzle_publications(id) on delete cascade,
  name text,
  invite_code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint groups_invite_code_unique unique (invite_code)
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint group_members_pk primary key (group_id, user_id)
);

create table public.group_leaderboard_entries (
  group_id uuid not null references public.groups(id) on delete cascade,
  leaderboard_entry_id uuid not null references public.leaderboard_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint group_leaderboard_entries_pk primary key (group_id, leaderboard_entry_id)
);

create index profiles_nickname_normalized_idx
  on public.profiles (nickname_normalized);

create unique index puzzles_locale_answer_idx
  on public.puzzles (locale, answer);

create index puzzles_status_quality_idx
  on public.puzzles (status, quality_score);

create index puzzle_publications_status_date_idx
  on public.puzzle_publications (status, publish_date_kst);

create index attempts_publication_user_idx
  on public.attempts (publication_id, user_id);

create index attempts_flagged_idx
  on public.attempts (flagged, created_at);

create index attempts_device_publication_idx
  on public.attempts (publication_id, device_hash);

create index leaderboard_sort_idx
  on public.leaderboard_entries (
    publication_id,
    rank_status,
    used_clue_count,
    elapsed_ms,
    submitted_at
  );

create unique index one_visible_or_flagged_ranked_success_per_user
  on public.leaderboard_entries (publication_id, user_id)
  where rank_status in ('visible', 'flagged');

create index groups_publication_idx
  on public.groups (publication_id);

create index groups_owner_idx
  on public.groups (owner_user_id);

create index group_members_user_idx
  on public.group_members (user_id);

create index group_leaderboard_entries_entry_idx
  on public.group_leaderboard_entries (leaderboard_entry_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger puzzles_set_updated_at
  before update on public.puzzles
  for each row execute function public.set_updated_at();

create trigger puzzle_publications_set_updated_at
  before update on public.puzzle_publications
  for each row execute function public.set_updated_at();

create or replace function public.normalize_nickname(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(value, ''), '\s+', '', 'g'));
$$;

create or replace function public.set_profile_nickname_normalized()
returns trigger
language plpgsql
as $$
begin
  new.nickname_normalized = public.normalize_nickname(new.nickname);
  return new;
end;
$$;

create trigger profiles_set_nickname_normalized
  before insert or update of nickname on public.profiles
  for each row execute function public.set_profile_nickname_normalized();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
begin
  base_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    '사용자'
  );
  if char_length(base_name) < 2 then
    base_name := base_name || '님';
  end if;

  insert into public.profiles (id, nickname, nickname_normalized, avatar_url)
  values (
    new.id,
    left(base_name, 12),
    public.normalize_nickname(left(base_name, 12)),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.puzzles enable row level security;
alter table public.puzzle_publications enable row level security;
alter table public.attempts enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_leaderboard_entries enable row level security;

create policy profiles_select_public
  on public.profiles
  for select
  using (true);

create policy profiles_insert_own
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy profiles_update_own
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy puzzles_select_published
  on public.puzzles
  for select
  using (
    exists (
      select 1
      from public.puzzle_publications pp
      where pp.puzzle_id = puzzles.id
        and pp.status = 'published'
    )
  );

create policy puzzle_publications_select_published
  on public.puzzle_publications
  for select
  using (status = 'published');

create policy attempts_select_own
  on public.attempts
  for select
  using (auth.uid() = user_id);

create policy attempts_insert_own_or_anonymous
  on public.attempts
  for insert
  with check (user_id is null or auth.uid() = user_id);

create policy attempts_update_own
  on public.attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy leaderboard_entries_select_visible
  on public.leaderboard_entries
  for select
  using (rank_status = 'visible');

create policy groups_select_member_or_owner
  on public.groups
  for select
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = auth.uid()
    )
  );

create policy groups_insert_own
  on public.groups
  for insert
  with check (owner_user_id = auth.uid());

create policy groups_update_own
  on public.groups
  for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy group_members_select_member
  on public.group_members
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id
        and g.owner_user_id = auth.uid()
    )
  );

create policy group_members_insert_self
  on public.group_members
  for insert
  with check (user_id = auth.uid());

create policy group_leaderboard_entries_select_group_member
  on public.group_leaderboard_entries
  for select
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_leaderboard_entries.group_id
        and gm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.groups g
      where g.id = group_leaderboard_entries.group_id
        and g.owner_user_id = auth.uid()
    )
  );

revoke all on public.profiles from anon, authenticated;
revoke all on public.puzzles from anon, authenticated;
revoke all on public.puzzle_publications from anon, authenticated;
revoke all on public.attempts from anon, authenticated;
revoke all on public.leaderboard_entries from anon, authenticated;
revoke all on public.groups from anon, authenticated;
revoke all on public.group_members from anon, authenticated;
revoke all on public.group_leaderboard_entries from anon, authenticated;

grant select (id, nickname, avatar_url) on public.profiles to anon, authenticated;
grant insert (id, nickname, nickname_normalized, avatar_url) on public.profiles to authenticated;
grant update (nickname, nickname_normalized, avatar_url, updated_at) on public.profiles to authenticated;

grant select (id, locale, category, difficulty, clues, status, created_at, updated_at) on public.puzzles to anon, authenticated;
grant select on public.puzzle_publications to anon, authenticated;

grant select, insert, update on public.attempts to anon, authenticated;
grant select on public.leaderboard_entries to anon, authenticated;

grant select, insert, update on public.groups to authenticated;
grant select, insert on public.group_members to authenticated;
grant select on public.group_leaderboard_entries to authenticated;
