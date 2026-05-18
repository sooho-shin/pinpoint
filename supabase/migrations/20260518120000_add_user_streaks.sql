create type public.daily_result_status as enum (
  'succeeded',
  'failed'
);

create table public.user_daily_results (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.puzzle_publications(id) on delete cascade,
  publish_date_kst date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  result_status public.daily_result_status not null,
  succeeded boolean not null,
  submitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_daily_result_per_user_publication unique (publication_id, user_id),
  constraint one_daily_result_per_user_date unique (user_id, publish_date_kst),
  constraint daily_result_status_succeeded_consistency check (
    (result_status = 'succeeded' and succeeded = true)
    or (result_status = 'failed' and succeeded = false)
  )
);

create table public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_success_count integer not null default 0,
  last_success_publish_date_kst date,
  last_result_publish_date_kst date,
  updated_at timestamptz not null default now(),
  constraint user_streaks_non_negative check (
    current_streak >= 0
    and longest_streak >= 0
    and total_success_count >= 0
  )
);

create index user_daily_results_publication_idx
  on public.user_daily_results (publication_id);

create index user_daily_results_user_date_idx
  on public.user_daily_results (user_id, publish_date_kst);

create index user_daily_results_user_success_date_idx
  on public.user_daily_results (user_id, succeeded, publish_date_kst desc);

create index user_streaks_current_rank_idx
  on public.user_streaks (
    current_streak desc,
    last_success_publish_date_kst desc,
    longest_streak desc,
    total_success_count desc
  );

create trigger user_daily_results_set_updated_at
  before update on public.user_daily_results
  for each row execute function public.set_updated_at();

create trigger user_streaks_set_updated_at
  before update on public.user_streaks
  for each row execute function public.set_updated_at();

alter table public.user_daily_results enable row level security;
alter table public.user_streaks enable row level security;

create policy user_daily_results_select_own
  on public.user_daily_results
  for select
  using (auth.uid() = user_id);

create policy user_streaks_select_public
  on public.user_streaks
  for select
  using (true);

revoke all on public.user_daily_results from anon, authenticated;
revoke all on public.user_streaks from anon, authenticated;

grant select on public.user_daily_results to authenticated;
grant select (
  user_id,
  current_streak,
  longest_streak,
  total_success_count,
  last_success_publish_date_kst,
  last_result_publish_date_kst,
  updated_at
) on public.user_streaks to anon, authenticated;
