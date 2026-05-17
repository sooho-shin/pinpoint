-- Enforce one play record per daily publication and actor identity.

create unique index if not exists attempts_one_user_attempt_per_publication
  on public.attempts (publication_id, user_id)
  where user_id is not null;

create unique index if not exists attempts_one_anonymous_attempt_per_publication
  on public.attempts (publication_id, anonymous_session_id)
  where anonymous_session_id is not null;
