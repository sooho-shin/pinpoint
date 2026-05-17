-- Add completion-gated daily puzzle feedback for ranking page discussion.

create type public.feedback_status as enum (
  'visible',
  'hidden'
);

create table public.daily_puzzle_feedback (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.puzzle_publications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  nickname_snapshot text not null,
  reaction text not null,
  comment text not null,
  feedback_status public.feedback_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_feedback_per_user_publication unique (publication_id, user_id),
  constraint one_feedback_per_attempt unique (attempt_id),
  constraint feedback_comment_length check (char_length(comment) between 1 and 140),
  constraint feedback_reaction_allowed check (reaction in ('easy', 'good', 'hard', 'tricky', 'fun'))
);

create index daily_puzzle_feedback_publication_status_idx
  on public.daily_puzzle_feedback (publication_id, feedback_status, created_at desc);

create trigger daily_puzzle_feedback_set_updated_at
  before update on public.daily_puzzle_feedback
  for each row execute function public.set_updated_at();

create or replace function public.ensure_daily_puzzle_feedback_completed_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_attempt record;
  selected_profile record;
begin
  select
    a.publication_id,
    a.user_id,
    a.status
  into selected_attempt
  from public.attempts a
  where a.id = new.attempt_id;

  if not found then
    raise exception 'attempt not found for daily puzzle feedback';
  end if;

  if selected_attempt.publication_id <> new.publication_id then
    raise exception 'daily puzzle feedback publication does not match attempt';
  end if;

  if selected_attempt.user_id <> new.user_id then
    raise exception 'daily puzzle feedback user does not match attempt';
  end if;

  if selected_attempt.status not in ('succeeded', 'failed') then
    raise exception 'daily puzzle feedback requires a completed attempt';
  end if;

  select p.nickname
  into selected_profile
  from public.profiles p
  where p.id = new.user_id;

  if not found then
    raise exception 'profile not found for daily puzzle feedback';
  end if;

  new.nickname_snapshot = selected_profile.nickname;
  return new;
end;
$$;

create trigger daily_puzzle_feedback_requires_completed_attempt
  before insert or update of publication_id, user_id, attempt_id, feedback_status
  on public.daily_puzzle_feedback
  for each row execute function public.ensure_daily_puzzle_feedback_completed_attempt();

alter table public.daily_puzzle_feedback enable row level security;

create policy daily_puzzle_feedback_select_completed_users
  on public.daily_puzzle_feedback
  for select
  using (
    feedback_status = 'visible'
    and exists (
      select 1
      from public.attempts a
      where a.publication_id = daily_puzzle_feedback.publication_id
        and a.user_id = auth.uid()
        and a.status in ('succeeded', 'failed')
    )
  );

create policy daily_puzzle_feedback_insert_own_completed
  on public.daily_puzzle_feedback
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.attempts a
      where a.id = attempt_id
        and a.publication_id = daily_puzzle_feedback.publication_id
        and a.user_id = auth.uid()
        and a.status in ('succeeded', 'failed')
    )
  );

create policy daily_puzzle_feedback_update_own_visible
  on public.daily_puzzle_feedback
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and feedback_status = 'visible'
    and exists (
      select 1
      from public.attempts a
      where a.id = attempt_id
        and a.publication_id = daily_puzzle_feedback.publication_id
        and a.user_id = auth.uid()
        and a.status in ('succeeded', 'failed')
    )
  );

revoke all on public.daily_puzzle_feedback from anon, authenticated;

grant select (nickname_snapshot, reaction, comment, created_at) on public.daily_puzzle_feedback to authenticated;
grant insert (publication_id, user_id, attempt_id, nickname_snapshot, reaction, comment, feedback_status) on public.daily_puzzle_feedback to authenticated;
grant update (attempt_id, nickname_snapshot, reaction, comment, feedback_status, updated_at) on public.daily_puzzle_feedback to authenticated;
