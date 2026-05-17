-- Add lookup index for anonymous daily play sessions.

create index if not exists attempts_publication_anonymous_session_idx
  on public.attempts (publication_id, anonymous_session_id);
