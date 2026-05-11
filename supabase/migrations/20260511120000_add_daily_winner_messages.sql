-- Add daily rank-1 megaphone messages.
-- The initial migration may already be applied remotely, so this change is additive.

create type public.winner_message_status as enum (
  'draft',
  'visible',
  'hidden'
);

create table public.daily_winner_messages (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.puzzle_publications(id) on delete cascade,
  leaderboard_entry_id uuid not null references public.leaderboard_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname_snapshot text not null,
  message text not null,
  message_status public.winner_message_status not null default 'draft',
  visible_from timestamptz not null,
  visible_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_winner_message_per_publication unique (publication_id),
  constraint one_winner_message_per_leaderboard_entry unique (leaderboard_entry_id),
  constraint winner_message_length check (char_length(message) between 1 and 100),
  constraint winner_message_visible_window check (visible_until > visible_from)
);

create index daily_winner_messages_current_idx
  on public.daily_winner_messages (message_status, visible_from, visible_until);

create unique index one_visible_winner_message_per_publication
  on public.daily_winner_messages (publication_id)
  where message_status = 'visible';

create trigger daily_winner_messages_set_updated_at
  before update on public.daily_winner_messages
  for each row execute function public.set_updated_at();

create or replace function public.ensure_daily_winner_message_rank_one()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_entry record;
  better_visible_count integer;
begin
  select
    le.publication_id,
    le.user_id,
    le.nickname_snapshot,
    le.used_clue_count,
    le.elapsed_ms,
    le.submitted_at,
    le.rank_status
  into selected_entry
  from public.leaderboard_entries le
  where le.id = new.leaderboard_entry_id;

  if not found then
    raise exception 'leaderboard entry not found for daily winner message';
  end if;

  if selected_entry.publication_id <> new.publication_id then
    raise exception 'daily winner message publication does not match leaderboard entry';
  end if;

  if selected_entry.user_id <> new.user_id then
    raise exception 'daily winner message user does not match leaderboard entry';
  end if;

  if selected_entry.rank_status <> 'visible' then
    raise exception 'daily winner message requires a visible leaderboard entry';
  end if;

  select count(*)
  into better_visible_count
  from public.leaderboard_entries le
  where le.publication_id = new.publication_id
    and le.rank_status = 'visible'
    and (
      le.used_clue_count < selected_entry.used_clue_count
      or (
        le.used_clue_count = selected_entry.used_clue_count
        and le.elapsed_ms < selected_entry.elapsed_ms
      )
      or (
        le.used_clue_count = selected_entry.used_clue_count
        and le.elapsed_ms = selected_entry.elapsed_ms
        and le.submitted_at < selected_entry.submitted_at
      )
    );

  if better_visible_count > 0 then
    raise exception 'daily winner message requires the rank 1 leaderboard entry';
  end if;

  new.nickname_snapshot = selected_entry.nickname_snapshot;
  return new;
end;
$$;

create trigger daily_winner_message_requires_rank_one
  before insert or update of publication_id, leaderboard_entry_id, user_id, message_status
  on public.daily_winner_messages
  for each row execute function public.ensure_daily_winner_message_rank_one();

alter table public.daily_winner_messages enable row level security;

create policy daily_winner_messages_select_current_visible
  on public.daily_winner_messages
  for select
  using (
    message_status = 'visible'
    and visible_from <= now()
    and visible_until > now()
  );

create policy daily_winner_messages_insert_own
  on public.daily_winner_messages
  for insert
  with check (user_id = auth.uid());

create policy daily_winner_messages_update_own_draft
  on public.daily_winner_messages
  for update
  using (user_id = auth.uid() and message_status = 'draft')
  with check (user_id = auth.uid() and message_status in ('draft', 'visible'));

revoke all on public.daily_winner_messages from anon, authenticated;

grant select (nickname_snapshot, message, visible_until) on public.daily_winner_messages to anon, authenticated;
grant insert (publication_id, leaderboard_entry_id, user_id, nickname_snapshot, message, message_status, visible_from, visible_until) on public.daily_winner_messages to authenticated;
grant update (message, message_status, visible_from, visible_until, updated_at) on public.daily_winner_messages to authenticated;
